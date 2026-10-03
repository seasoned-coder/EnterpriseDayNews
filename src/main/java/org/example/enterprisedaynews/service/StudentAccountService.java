package org.example.enterprisedaynews.service;

import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

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

    private final ImageRepository imageRepository;

    public StudentAccountService(StudentAccountRepository repository, LoginGuard loginGuard,
                                 ImageRepository imageRepository) {
        super(repository, loginGuard, PasswordPolicy.STUDENT_MIN_LENGTH, "student");
        this.imageRepository = imageRepository;
    }

    @Override
    protected StudentAccount newAccount() {
        return new StudentAccount();
    }

    /** Uploads are linked by username, so they move with a renamed student (they can still manage them). */
    @Override
    protected void onRenamed(String oldUsername, String newUsername) {
        imageRepository.renameUploader(oldUsername, newUsername);
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
