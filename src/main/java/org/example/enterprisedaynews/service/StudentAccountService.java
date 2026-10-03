package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentAccountService {

    /**
     * Student accounts that older versions created automatically, with passwords that were published
     * in this (public) repository. They are no longer created, and are locked at startup if they still
     * use those passwords.
     */
    static final Map<String, String> PUBLISHED_DEFAULT_ACCOUNTS = Map.of(
            "student", "EdNews1",
            "guest", "Guest1A"
    );

    private final StudentAccountRepository studentAccountRepository;
    private final LoginGuard loginGuard;

    /** Locks any account still using a password published in this repository. Returns how many were locked. */
    @Transactional
    public int lockAccountsWithPublishedPasswords() {
        int locked = 0;
        for (Map.Entry<String, String> entry : PUBLISHED_DEFAULT_ACCOUNTS.entrySet()) {
            Optional<StudentAccount> found = studentAccountRepository.findByUsername(entry.getKey());
            if (found.isPresent() && !found.get().isLocked() && loginGuard.storedPasswordIs(found.get(), entry.getValue())) {
                StudentAccount account = found.get();
                account.setLocked(true);
                account.setUpdatedAt(LocalDateTime.now());
                studentAccountRepository.save(account);
                locked++;
                log.warn("Locked student account '{}': it still uses a password published in the source code. "
                        + "Set a new password from the Student Account Dashboard and unlock it if it is needed.",
                        account.getUsername());
            }
        }
        return locked;
    }

    @Transactional(readOnly = true)
    public List<StudentAccount> listAccounts() {
        return studentAccountRepository.findAllByOrderByUsernameAsc();
    }

    @Transactional(readOnly = true)
    public Optional<StudentAccount> findActiveAccount(String username) {
        String normalized = PasswordPolicy.normalizeUsername(username);
        if (normalized == null) {
            return Optional.empty();
        }
        return studentAccountRepository.findByUsername(normalized)
                .filter(account -> !loginGuard.isLockedNow(account));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public StudentAccount authenticate(String username, String password) {
        String normalized = PasswordPolicy.normalizeAndValidateUsername(username);
        String normalizedPassword = PasswordPolicy.normalizeLoginPassword(password);
        return loginGuard.authenticate(studentAccountRepository.findByUsername(normalized), normalizedPassword,
                studentAccountRepository, "Student account is locked");
    }

    @Transactional
    public StudentAccount recordSuccessfulLogin(StudentAccount account, String ipAddress) {
        return loginGuard.recordSuccessfulLogin(account, ipAddress, studentAccountRepository);
    }

    @Transactional
    public StudentAccount createAccount(String username, String password) {
        String normalizedUsername = PasswordPolicy.normalizeAndValidateUsername(username);
        String normalizedPassword = PasswordPolicy.validateNewPassword(password, PasswordPolicy.STUDENT_MIN_LENGTH);

        if (studentAccountRepository.existsByUsername(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A student account with that username already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        return studentAccountRepository.save(StudentAccount.builder()
                .username(normalizedUsername)
                .passwordHash(loginGuard.hash(normalizedPassword))
                .locked(false)
                .failedLoginAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    @Transactional
    public StudentAccount setLocked(Long id, boolean locked) {
        StudentAccount account = findById(id);
        account.setLocked(locked);
        if (!locked) {
            loginGuard.clearFailedAttemptState(account);
        }
        account.setUpdatedAt(LocalDateTime.now());
        return studentAccountRepository.save(account);
    }

    @Transactional
    public StudentAccount changePassword(Long id, String password) {
        String normalizedPassword = PasswordPolicy.validateNewPassword(password, PasswordPolicy.STUDENT_MIN_LENGTH);
        StudentAccount account = findById(id);
        account.setPasswordHash(loginGuard.hash(normalizedPassword));
        account.setUpdatedAt(LocalDateTime.now());
        return studentAccountRepository.save(account);
    }

    @Transactional
    public void deleteAccount(Long id) {
        studentAccountRepository.delete(findById(id));
    }

    private StudentAccount findById(Long id) {
        return studentAccountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));
    }
}
