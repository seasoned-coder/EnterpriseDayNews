package org.example.enterprisedaynews.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class StudentAccountService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]+$");
    private static final int MIN_PASSWORD_LENGTH = 6;
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int TEMP_LOCK_MINUTES = 15;
    private static final Set<String> COMMON_PASSWORD_BLOCKLIST = Set.of(
            "password", "password1", "password123", "qwerty", "qwerty123",
            "123456", "1234567", "12345678", "abc123", "letmein",
            "student", "student1", "school", "welcome", "admin", "enterprise"
    );

    private final StudentAccountRepository studentAccountRepository;
    private final PasswordEncoder passwordEncoder;

    @PostConstruct
    @Transactional
    public void ensureDefaultAccounts() {
        ensureAccountExists("student", "EdNews1");
        ensureAccountExists("guest", "Guest1A");
    }

    @Transactional(readOnly = true)
    public List<StudentAccount> listAccounts() {
        return studentAccountRepository.findAllByOrderByUsernameAsc();
    }

    @Transactional(readOnly = true)
    public Optional<StudentAccount> findActiveAccount(String username) {
        String normalized = normalizeUsername(username);
        if (normalized == null) {
            return Optional.empty();
        }
        return studentAccountRepository.findByUsername(normalized)
                .filter(account -> !isAccountLockedNow(account));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public StudentAccount authenticate(String username, String password) {
        String normalized = normalizeAndValidateUsername(username);
        String normalizedPassword = normalizeAndValidateLoginPassword(password);

        StudentAccount account = studentAccountRepository.findByUsername(normalized)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (account.isLocked()) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Student account is locked");
        }

        if (isTemporarilyLocked(account)) {
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "Too many failed attempts. This account is temporarily locked.");
        }

        if (!passwordEncoder.matches(normalizedPassword, account.getPasswordHash())) {
            boolean lockedNow = registerFailedAttempt(account);
            if (lockedNow) {
                throw new ResponseStatusException(HttpStatus.LOCKED,
                        "Too many failed attempts. This account is temporarily locked for 15 minutes.");
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        clearFailedAttemptState(account);

        return account;
    }

    @Transactional
    public StudentAccount recordSuccessfulLogin(StudentAccount account, String ipAddress) {
        clearFailedAttemptState(account);
        account.setLastLoginAt(LocalDateTime.now());
        account.setLastLoginIp(normalizeIp(ipAddress));
        account.setUpdatedAt(LocalDateTime.now());
        return studentAccountRepository.save(account);
    }

    @Transactional
    public StudentAccount createAccount(String username, String password) {
        String normalizedUsername = normalizeAndValidateUsername(username);
        String normalizedPassword = normalizeAndValidatePassword(password);

        if (studentAccountRepository.existsByUsername(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A student account with that username already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        StudentAccount account = StudentAccount.builder()
                .username(normalizedUsername)
                .passwordHash(passwordEncoder.encode(normalizedPassword))
                .locked(false)
                .failedLoginAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
        return studentAccountRepository.save(account);
    }

    @Transactional
    public StudentAccount setLocked(Long id, boolean locked) {
        StudentAccount account = findById(id);
        account.setLocked(locked);
        if (!locked) {
            clearFailedAttemptState(account);
        }
        account.setUpdatedAt(LocalDateTime.now());
        return studentAccountRepository.save(account);
    }

    @Transactional
    public StudentAccount changePassword(Long id, String password) {
        String normalizedPassword = normalizeAndValidatePassword(password);
        StudentAccount account = findById(id);
        account.setPasswordHash(passwordEncoder.encode(normalizedPassword));
        account.setUpdatedAt(LocalDateTime.now());
        return studentAccountRepository.save(account);
    }

    @Transactional
    public void deleteAccount(Long id) {
        studentAccountRepository.delete(findById(id));
    }

    private void ensureAccountExists(String username, String password) {
        String normalizedUsername = normalizeUsername(username);
        if (normalizedUsername == null || studentAccountRepository.existsByUsername(normalizedUsername)) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        studentAccountRepository.save(StudentAccount.builder()
                .username(normalizedUsername)
                .passwordHash(passwordEncoder.encode(password))
                .locked(false)
                .failedLoginAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    private StudentAccount findById(Long id) {
        return studentAccountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student account not found"));
    }

    private String normalizeAndValidateUsername(String username) {
        String normalized = normalizeUsername(username);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        if (!USERNAME_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Username may only contain letters, numbers, dots, dashes, and underscores");
        }
        return normalized;
    }

    private String normalizeAndValidatePassword(String password) {
        String normalized = normalizeAndValidateLoginPassword(password);
        if (normalized.length() < MIN_PASSWORD_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be at least " + MIN_PASSWORD_LENGTH + " characters long");
        }

        boolean hasUppercase = normalized.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit = normalized.chars().anyMatch(Character::isDigit);
        if (!hasUppercase || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must include at least one uppercase letter and one number");
        }

        String lower = normalized.toLowerCase(Locale.ROOT);
        if (COMMON_PASSWORD_BLOCKLIST.contains(lower)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Please choose a stronger password");
        }

        return normalized;
    }

    private String normalizeAndValidateLoginPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
        return password.trim();
    }

    private boolean isAccountLockedNow(StudentAccount account) {
        return account.isLocked() || isTemporarilyLocked(account);
    }

    private boolean isTemporarilyLocked(StudentAccount account) {
        LocalDateTime until = account.getTemporaryLockUntil();
        return until != null && until.isAfter(LocalDateTime.now());
    }

    private boolean registerFailedAttempt(StudentAccount account) {
        int attempts = account.getFailedLoginAttempts() + 1;
        account.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            account.setTemporaryLockUntil(LocalDateTime.now().plusMinutes(TEMP_LOCK_MINUTES));
            account.setFailedLoginAttempts(0);
        }
        account.setUpdatedAt(LocalDateTime.now());
        studentAccountRepository.save(account);
        return account.getTemporaryLockUntil() != null && account.getTemporaryLockUntil().isAfter(LocalDateTime.now());
    }

    private void clearFailedAttemptState(StudentAccount account) {
        account.setFailedLoginAttempts(0);
        account.setTemporaryLockUntil(null);
    }

    private String normalizeUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            return null;
        }
        return username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return null;
        }
        return ipAddress.trim();
    }
}



