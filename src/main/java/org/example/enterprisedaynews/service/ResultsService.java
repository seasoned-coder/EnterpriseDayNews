package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.EventResults;
import org.example.enterprisedaynews.dto.PlayReport;
import org.example.enterprisedaynews.dto.StudentResults;
import org.example.enterprisedaynews.dto.TeamResult;
import org.example.enterprisedaynews.model.AdvertPlay;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.AdvertPlayRepository;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.TeamPlayTotals;
import org.example.enterprisedaynews.repository.TeamSpend;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Screen time and results (issue #40): the projector reports what it showed; teams and staff see what each
 * team got for its money.
 */
@Service
@RequiredArgsConstructor
public class ResultsService {

    /** Most showings in one report (the projector sends them in batches, more after being offline). */
    static final int MAX_REPORTS_AT_ONCE = 500;
    /** A showing reported later than this (e.g. a projector left off overnight) is ignored. */
    static final Duration OLDEST_REPORT = Duration.ofHours(24);
    private static final Duration CLOCK_SLACK = Duration.ofMinutes(2);

    /** Longest showing a student can pay for; nothing recorded can be longer. */
    static final int LONGEST_SHOWING = PriceList.DURATION_SECONDS.stream()
            .mapToInt(PriceList.Option::value).max().orElse(30);

    private final AdvertPlayRepository playRepository;
    private final ImageRepository imageRepository;

    /**
     * Records the showings the projector reports. Anything that doesn't add up (unknown or staff items,
     * impossible lengths or times) is skipped rather than failing the batch, so one bad entry can't make the
     * projector resend forever.
     *
     * @return how many were recorded
     */
    @Transactional
    public int recordPlays(List<PlayReport> reports) {
        if (reports == null || reports.isEmpty()) {
            return 0;
        }
        if (reports.size() > MAX_REPORTS_AT_ONCE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Send at most " + MAX_REPORTS_AT_ONCE + " showings at once");
        }
        Set<Long> ids = reports.stream().map(PlayReport::imageId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, ImageMetadata> adverts = imageRepository.findAllById(ids).stream()
                .filter(m -> !m.isInfoMessage() && m.getUploadedBy() != null)
                .collect(Collectors.toMap(ImageMetadata::getId, Function.identity()));

        LocalDateTime now = LocalDateTime.now();
        List<AdvertPlay> plays = reports.stream()
                .filter(r -> adverts.containsKey(r.imageId()))
                .filter(r -> r.seconds() >= 1)
                .map(r -> AdvertPlay.builder()
                        .imageId(r.imageId())
                        .team(adverts.get(r.imageId()).getUploadedBy())
                        .seconds(Math.min(r.seconds(), LONGEST_SHOWING))
                        .playedAt(r.playedAt() == null ? now
                                : r.playedAt().atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime())
                        .build())
                .filter(p -> !p.getPlayedAt().isAfter(now.plus(CLOCK_SLACK))
                        && !p.getPlayedAt().isBefore(now.minus(OLDEST_REPORT)))
                .toList();
        playRepository.saveAll(plays);
        return plays.size();
    }

    /** Every team that has uploaded or been shown, most screen time first (then most spent, then name). */
    public EventResults eventResults() {
        Map<String, TeamSpend> spend = imageRepository.spendByTeam(ApprovalStatus.APPROVED).stream()
                .collect(Collectors.toMap(TeamSpend::team, Function.identity()));
        Map<String, TeamPlayTotals> plays = playRepository.totalsByTeam().stream()
                .collect(Collectors.toMap(TeamPlayTotals::team, Function.identity()));

        Set<String> teams = new LinkedHashSet<>(imageRepository.studentUploaders());
        teams.addAll(plays.keySet());

        List<TeamResult> results = teams.stream()
                .map(team -> resultFor(team, spend.get(team), plays.get(team)))
                .sorted(Comparator.comparingLong(TeamResult::seconds).reversed()
                        .thenComparing(Comparator.comparingLong(TeamResult::spent).reversed())
                        .thenComparing(TeamResult::team))
                .toList();
        return EventResults.of(results, playRepository.lastPlayedAt());
    }

    /** One team's totals and each of its adverts' screen time. */
    public StudentResults studentResults(String team) {
        TeamSpend spend = imageRepository.spendByTeam(ApprovalStatus.APPROVED).stream()
                .filter(s -> team.equals(s.team())).findFirst().orElse(null);
        Map<Long, StudentResults.AdvertResult> byAdvert = new HashMap<>();
        long plays = 0, seconds = 0;
        for (var totals : playRepository.totalsByAdvertForTeam(team)) {
            byAdvert.put(totals.imageId(),
                    new StudentResults.AdvertResult(totals.imageId(), totals.plays(), totals.seconds()));
            plays += totals.plays();
            seconds += totals.seconds();
        }
        return new StudentResults(
                resultFor(team, spend, new TeamPlayTotals(team, plays, seconds)),
                List.copyOf(byAdvert.values()));
    }

    /** Wipes all recorded showings (part of resetting the event). */
    @Transactional
    public long deleteAllPlays() {
        long count = playRepository.count();
        playRepository.deleteAllInBatch();
        return count;
    }

    private static TeamResult resultFor(String team, TeamSpend spend, TeamPlayTotals plays) {
        return TeamResult.of(team,
                spend == null ? 0 : spend.adverts(),
                spend == null ? 0 : spend.spent(),
                plays == null ? 0 : plays.plays(),
                plays == null ? 0 : plays.seconds());
    }
}
