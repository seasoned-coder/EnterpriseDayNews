package org.example.enterprisedaynews.service;

import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.dto.TeamLogin;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.repository.AdvertPlayRepository;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.LedgerRepository;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
public class StudentAccountService extends AccountService<StudentAccount> {

    /**
     * Student accounts that older versions created automatically, with passwords that were published
     * in this (public) repository. They are no longer created, and are locked at startup if they still
     * use those passwords.
     */
    static final Map<String, String> PUBLISHED_DEFAULT_ACCOUNTS = Map.of(
            "student", "EdNews1",
            "guest", "Guest1A"
    );

    /** Most teams created in one go; a big event has about 52. */
    static final int MAX_TEAMS_AT_ONCE = 200;

    private final ImageRepository imageRepository;
    private final AdvertPlayRepository playRepository;
    private final LedgerRepository ledgerRepository;
    private final FriendlyPasswords friendlyPasswords;

    public StudentAccountService(StudentAccountRepository repository, LoginGuard loginGuard,
                                 ImageRepository imageRepository, AdvertPlayRepository playRepository,
                                 LedgerRepository ledgerRepository, FriendlyPasswords friendlyPasswords) {
        super(repository, loginGuard, PasswordPolicy.STUDENT_MIN_LENGTH, "student");
        this.imageRepository = imageRepository;
        this.playRepository = playRepository;
        this.ledgerRepository = ledgerRepository;
        this.friendlyPasswords = friendlyPasswords;
    }

    /**
     * Creates a team account for each name, with a generated password to print on its login slip (issue #37).
     * Names that are invalid, repeated or already taken are skipped (with the reason) rather than failing the
     * rest. Each account is saved on its own, so one clash doesn't undo the others.
     */
    public List<TeamLogin> createTeams(List<String> usernames) {
        if (usernames == null || usernames.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least one team name");
        }
        if (usernames.size() > MAX_TEAMS_AT_ONCE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "You can create up to " + MAX_TEAMS_AT_ONCE + " teams at once");
        }
        List<TeamLogin> results = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String raw : usernames) {
            String shown = raw == null ? "" : raw.trim();
            String normalized = PasswordPolicy.normalizeUsername(raw);
            if (normalized != null && !seen.add(normalized)) {
                results.add(TeamLogin.skipped(normalized, "Listed twice"));
                continue;
            }
            String password = friendlyPasswords.next();
            try {
                results.add(TeamLogin.created(createAccount(raw, password).getUsername(), password));
            } catch (ResponseStatusException ex) {
                results.add(TeamLogin.skipped(normalized != null ? normalized : shown, ex.getReason()));
            } catch (DataIntegrityViolationException ex) {
                results.add(TeamLogin.skipped(normalized, "Already exists"));
            }
        }
        return results;
    }

    /** Gives a team a new generated password, e.g. to reprint a lost login slip (issue #37). */
    public TeamLogin newGeneratedPassword(Long id) {
        String password = friendlyPasswords.next();
        return TeamLogin.reset(changePassword(id, password).getUsername(), password);
    }

    @Override
    protected StudentAccount newAccount() {
        return new StudentAccount();
    }

    /**
     * Uploads and screen time (#40) are linked by username, so they move with a renamed student (they can
     * still manage their adverts, and keep their results).
     */
    @Override
    protected void onRenamed(String oldUsername, String newUsername) {
        imageRepository.renameUploader(oldUsername, newUsername);
        playRepository.renameTeam(oldUsername, newUsername);
        ledgerRepository.renameTeam(oldUsername, newUsername); // its balance and payments (#48)
    }

    /** Locks any account still using a password published in this repository. Returns how many were locked. */
    @Transactional
    public int lockAccountsWithPublishedPasswords() {
        int locked = 0;
        for (Map.Entry<String, String> entry : PUBLISHED_DEFAULT_ACCOUNTS.entrySet()) {
            Optional<StudentAccount> found = repository.findByUsername(entry.getKey());
            if (found.isPresent() && !found.get().isLocked() && loginGuard.storedPasswordIs(found.get(), entry.getValue())) {
                StudentAccount account = found.get();
                account.setLocked(true);
                account.setUpdatedAt(LocalDateTime.now());
                repository.save(account);
                locked++;
                log.warn("Locked student account '{}': it still uses a password published in the source code. "
                        + "Set a new password from the Student Account Dashboard and unlock it if it is needed.",
                        account.getUsername());
            }
        }
        return locked;
    }
}
