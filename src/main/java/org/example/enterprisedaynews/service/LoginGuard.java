package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.model.LoginAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Password checking, brute-force lockout and login recording shared by student and staff accounts.
 * Callers are responsible for the surrounding transaction.
 */
@Component
@RequiredArgsConstructor
class LoginGuard {

    static final int MAX_FAILED_ATTEMPTS = 5;
    static final int TEMP_LOCK_MINUTES = 15;

    private static final Pattern BCRYPT_HASH_PATTERN = Pattern.compile("^\\$2[aby]?\\$\\d{2}\\$.{53}$");

    private final PasswordEncoder passwordEncoder;

    <T extends LoginAccount> T authenticate(Optional<T> found, String rawPassword,
                                            JpaRepository<T, Long> repository, String lockedMessage) {
        T account = found.orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password"));

        if (account.isLocked()) {
            throw new ResponseStatusException(HttpStatus.LOCKED, lockedMessage);
        }

        if (isTemporarilyLocked(account)) {
            throw new ResponseStatusException(HttpStatus.LOCKED,
                    "Too many failed attempts. This account is temporarily locked.");
        }

        if (!passwordMatches(account, rawPassword, repository)) {
            if (registerFailedAttempt(account, repository)) {
                throw new ResponseStatusException(HttpStatus.LOCKED,
                        "Too many failed attempts. This account is temporarily locked for "
                                + TEMP_LOCK_MINUTES + " minutes.");
            }
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }

        clearFailedAttemptState(account);
        return account;
    }

    <T extends LoginAccount> T recordSuccessfulLogin(T account, String ipAddress, JpaRepository<T, Long> repository) {
        clearFailedAttemptState(account);
        LocalDateTime now = LocalDateTime.now();
        account.setLastLoginAt(now);
        account.setLastLoginIp(ipAddress == null || ipAddress.isBlank() ? null : ipAddress.trim());
        account.setUpdatedAt(now);
        return repository.save(account);
    }

    String hash(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    /** True if the stored password is exactly {@code rawPassword}; never upgrades or saves anything. */
    boolean storedPasswordIs(LoginAccount account, String rawPassword) {
        String stored = account.getPasswordHash();
        if (stored == null || stored.isBlank()) {
            return false;
        }
        if (isBcryptHash(stored)) {
            try {
                return passwordEncoder.matches(rawPassword, stored);
            } catch (IllegalArgumentException ignored) {
                return false;
            }
        }
        return stored.equals(rawPassword);
    }

    boolean isLockedNow(LoginAccount account) {
        return account.isLocked() || isTemporarilyLocked(account);
    }

    boolean isTemporarilyLocked(LoginAccount account) {
        LocalDateTime until = account.getTemporaryLockUntil();
        return until != null && until.isAfter(LocalDateTime.now());
    }

    void clearFailedAttemptState(LoginAccount account) {
        account.setFailedLoginAttempts(0);
        account.setTemporaryLockUntil(null);
    }

    private <T extends LoginAccount> boolean registerFailedAttempt(T account, JpaRepository<T, Long> repository) {
        int attempts = account.getFailedLoginAttempts() + 1;
        account.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            account.setTemporaryLockUntil(LocalDateTime.now().plusMinutes(TEMP_LOCK_MINUTES));
            account.setFailedLoginAttempts(0);
        }
        account.setUpdatedAt(LocalDateTime.now());
        repository.save(account);
        return isTemporarilyLocked(account);
    }

    /** Checks the password; a legacy plaintext password that matches is upgraded to a BCrypt hash. */
    private <T extends LoginAccount> boolean passwordMatches(T account, String rawPassword,
                                                             JpaRepository<T, Long> repository) {
        if (!storedPasswordIs(account, rawPassword)) {
            return false;
        }
        if (!isBcryptHash(account.getPasswordHash())) {
            account.setPasswordHash(passwordEncoder.encode(rawPassword));
            account.setUpdatedAt(LocalDateTime.now());
            repository.save(account);
        }
        return true;
    }

    private boolean isBcryptHash(String passwordHash) {
        return BCRYPT_HASH_PATTERN.matcher(passwordHash).matches();
    }
}
