package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.TeamAccount;
import org.example.enterprisedaynews.dto.TeamBalance;
import org.example.enterprisedaynews.live.LiveTopic;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.model.LedgerEntry;
import org.example.enterprisedaynews.model.LedgerEntry.Kind;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.LedgerRepository;
import org.example.enterprisedaynews.repository.LedgerTotals;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.repository.TeamAdvertCounts;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * What each team owes for its adverts, in event money (issue #48). The rules agreed for the event:
 * <ul>
 *     <li>An advert is <b>owed once approved</b> (at the price locked in when it was uploaded, #41/#47).
 *     Rejected adverts are never charged.</li>
 *     <li>An approved advert later <b>rejected</b> is credited back.</li>
 *     <li>A team <b>deleting</b> its own approved advert still owes for it: no refunds.</li>
 *     <li>Staff take the money from the team's bank themselves, then mark the <b>whole</b> balance as paid
 *     (no partial payments).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class TeamBalanceService {

    private final LedgerRepository ledgerRepository;
    private final ImageRepository imageRepository;
    private final StudentAccountRepository studentAccountRepository;
    private final ApplicationEventPublisher events;
    private final TransactionTemplate transactions;
    private final Object paymentLock = new Object();

    /**
     * Called (in the same transaction) when staff approve or reject an advert. Approving charges the team;
     * rejecting an approved one credits it back. Staff items cost nothing.
     */
    @Transactional
    public void onStatusChange(ImageMetadata advert, ApprovalStatus from, ApprovalStatus to, String staff) {
        if (advert.isInfoMessage() || advert.getUploadedBy() == null || from == to) {
            return;
        }
        Kind kind;
        if (to == ApprovalStatus.APPROVED) {
            kind = Kind.CHARGE;
        } else if (from == ApprovalStatus.APPROVED && to == ApprovalStatus.REJECTED) {
            kind = Kind.CREDIT;
        } else {
            return; // e.g. NEW -> REJECTED: never charged, nothing to give back
        }
        ledgerRepository.save(LedgerEntry.builder()
                .team(advert.getUploadedBy())
                .kind(kind)
                .amount(advert.getTotalCost())
                .imageId(advert.getId())
                .description(describe(advert, kind))
                .createdAt(LocalDateTime.now())
                .recordedBy(staff)
                .build());
        changed();
    }

    /**
     * Staff have taken the team's whole balance from its bank: record the payment, bringing the balance to 0.
     *
     * @param expected the balance the staff member saw; refused if it has changed since (so they never mark
     *                 as paid an amount they didn't take)
     */
    public TeamBalance markPaid(String team, long expected, String staff) {
        // One payment at a time, each committed before the next is checked: two staff pressing "paid" at once
        // can't both record it.
        synchronized (paymentLock) {
            return transactions.execute(status -> recordPayment(team, expected, staff));
        }
    }

    private TeamBalance recordPayment(String team, long expected, String staff) {
        long owed = balanceOf(team).owed();
        if (owed <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, team + " doesn't owe anything");
        }
        if (expected != owed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    team + " now owes " + owed + " (not " + expected + "): check, take that amount, and try again");
        }
        ledgerRepository.save(LedgerEntry.builder()
                .team(team)
                .kind(Kind.PAYMENT)
                .amount(Math.toIntExact(owed))
                .description("Paid from the team's bank")
                .createdAt(LocalDateTime.now())
                .recordedBy(staff)
                .build());
        changed();
        return balanceOf(team);
    }

    /** Every team (all team accounts, plus any team with history), by name. */
    public List<TeamBalance> balances() {
        Map<String, Map<Kind, LedgerTotals>> totals = totalsByTeam();
        Map<String, TeamAdvertCounts> counts = imageRepository.advertCountsByTeam().stream()
                .collect(Collectors.toMap(TeamAdvertCounts::team, Function.identity()));
        Set<String> teams = new LinkedHashSet<>();
        studentAccountRepository.findAllByOrderByUsernameAsc().stream().map(StudentAccount::getUsername).forEach(teams::add);
        teams.addAll(totals.keySet());
        teams.addAll(counts.keySet());
        return teams.stream().sorted()
                .map(team -> balance(team, totals.getOrDefault(team, Map.of()), counts.get(team)))
                .toList();
    }

    public TeamBalance balanceOf(String team) {
        TeamAdvertCounts counts = imageRepository.advertCountsByTeam().stream()
                .filter(c -> team.equals(c.team())).findFirst().orElse(null);
        return balance(team, totalsByTeam().getOrDefault(team, Map.of()), counts);
    }

    /** The balance and every line behind it. */
    public TeamAccount account(String team) {
        return new TeamAccount(balanceOf(team),
                ledgerRepository.findByTeamOrderByCreatedAtAscIdAsc(team).stream().map(TeamAccount.Entry::from).toList());
    }

    /** Wipes every balance and payment (part of resetting the event, after printing the report). */
    @Transactional
    public long deleteAll() {
        long count = ledgerRepository.count();
        ledgerRepository.deleteAllInBatch();
        changed();
        return count;
    }

    private Map<String, Map<Kind, LedgerTotals>> totalsByTeam() {
        Map<String, Map<Kind, LedgerTotals>> byTeam = new HashMap<>();
        for (LedgerTotals t : ledgerRepository.totalsByTeamAndKind()) {
            byTeam.computeIfAbsent(t.team(), k -> new EnumMap<>(Kind.class)).put(t.kind(), t);
        }
        return byTeam;
    }

    private static TeamBalance balance(String team, Map<Kind, LedgerTotals> totals, TeamAdvertCounts counts) {
        long charged = sum(totals, Kind.CHARGE);
        long credited = sum(totals, Kind.CREDIT);
        long paid = sum(totals, Kind.PAYMENT);
        long chargedAdverts = count(totals, Kind.CHARGE) - count(totals, Kind.CREDIT);
        return new TeamBalance(team, charged, credited, paid, charged - credited - paid,
                counts == null ? 0 : counts.uploaded(), chargedAdverts);
    }

    private static long sum(Map<Kind, LedgerTotals> totals, Kind kind) {
        LedgerTotals t = totals.get(kind);
        return t == null ? 0 : t.amount();
    }

    private static long count(Map<Kind, LedgerTotals> totals, Kind kind) {
        LedgerTotals t = totals.get(kind);
        return t == null ? 0 : t.count();
    }

    private static String describe(ImageMetadata advert, Kind kind) {
        String what = (advert.getOriginalFileName() == null ? "Advert" : advert.getOriginalFileName())
                + " (priority " + advert.getPriority() + ", " + advert.getDurationSeconds() + " s)";
        String full = (kind == Kind.CREDIT ? "Refund, not approved after all: " : "Approved: ") + what;
        return full.length() > 255 ? full.substring(0, 255) : full;
    }

    private void changed() {
        events.publishEvent(new LiveTopic.Changed(LiveTopic.BALANCES));
    }
}
