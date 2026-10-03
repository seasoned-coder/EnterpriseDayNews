package org.example.enterprisedaynews.service;

import org.example.enterprisedaynews.model.LoginAccount;
import org.example.enterprisedaynews.repository.LoginAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Everything students and staff accounts have in common: sign-in with lockout, login recording, and
 * staff managing the accounts (create, lock/unlock, reset password, delete). Subclasses supply the
 * entity type, password strength and any extra rules.
 */
public abstract class AccountService<T extends LoginAccount> {

    protected final LoginAccountRepository<T> repository;
    protected final LoginGuard loginGuard;
    private final int minPasswordLength;
    private final String kind;

    /**
     * @param kind used in messages, e.g. "student" gives "Student account is locked".
     */
    protected AccountService(LoginAccountRepository<T> repository, LoginGuard loginGuard,
                             int minPasswordLength, String kind) {
        this.repository = repository;
        this.loginGuard = loginGuard;
        this.minPasswordLength = minPasswordLength;
        this.kind = kind;
    }

    /** A new, empty entity of the right type. */
    protected abstract T newAccount();

    /**
     * Hook for extra rules before a staff member locks or deletes an account (e.g. not yourself).
     * Throw a {@link ResponseStatusException} to refuse.
     */
    protected void checkCanLockOrDelete(T account, String actingUsername, String action) {
    }

    @Transactional(readOnly = true)
    public List<T> listAccounts() {
        return repository.findAllByOrderByUsernameAsc();
    }

    /** The account if it exists and isn't locked; tokens are only honoured for these. */
    @Transactional(readOnly = true)
    public Optional<T> findActiveAccount(String username) {
        String normalized = PasswordPolicy.normalizeUsername(username);
        if (normalized == null) {
            return Optional.empty();
        }
        return repository.findByUsername(normalized).filter(account -> !loginGuard.isLockedNow(account));
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public T authenticate(String username, String password) {
        String normalized = PasswordPolicy.normalizeAndValidateUsername(username);
        String normalizedPassword = PasswordPolicy.normalizeLoginPassword(password);
        return loginGuard.authenticate(repository.findByUsername(normalized), normalizedPassword,
                repository, capitalized(kind) + " account is locked");
    }

    @Transactional
    public T recordSuccessfulLogin(T account, String ipAddress) {
        return loginGuard.recordSuccessfulLogin(account, ipAddress, repository);
    }

    @Transactional
    public T createAccount(String username, String password) {
        String normalizedUsername = PasswordPolicy.normalizeAndValidateUsername(username);
        String normalizedPassword = PasswordPolicy.validateNewPassword(password, minPasswordLength);

        if (repository.existsByUsername(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A " + kind + " account with that username already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        T account = newAccount();
        account.setUsername(normalizedUsername);
        account.setPasswordHash(loginGuard.hash(normalizedPassword));
        account.setLocked(false);
        account.setFailedLoginAttempts(0);
        account.setCreatedAt(now);
        account.setUpdatedAt(now);
        return repository.save(account);
    }

    /** Unlocking also clears any temporary lockout from failed sign-ins. */
    @Transactional
    public T setLocked(Long id, boolean locked, String actingUsername) {
        T account = findById(id);
        if (locked) {
            checkCanLockOrDelete(account, actingUsername, "lock");
        }
        account.setLocked(locked);
        if (!locked) {
            loginGuard.clearFailedAttemptState(account);
        }
        account.setUpdatedAt(LocalDateTime.now());
        return repository.save(account);
    }

    @Transactional
    public T changePassword(Long id, String password) {
        String normalizedPassword = PasswordPolicy.validateNewPassword(password, minPasswordLength);
        T account = findById(id);
        account.setPasswordHash(loginGuard.hash(normalizedPassword));
        account.setUpdatedAt(LocalDateTime.now());
        return repository.save(account);
    }

    @Transactional
    public void deleteAccount(Long id, String actingUsername) {
        T account = findById(id);
        checkCanLockOrDelete(account, actingUsername, "delete");
        repository.delete(account);
    }

    protected T findById(Long id) {
        return repository.findById(id).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, capitalized(kind) + " account not found"));
    }

    private static String capitalized(String text) {
        return Character.toUpperCase(text.charAt(0)) + text.substring(1);
    }
}
