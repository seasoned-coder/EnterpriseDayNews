package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.StaffAccount;
import org.example.enterprisedaynews.repository.StaffAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffAccountService {

    private final StaffAccountRepository staffAccountRepository;
    private final LoginGuard loginGuard;

    // First staff account, supplied at deploy time (APP_STAFF_BOOTSTRAP_USERNAME / _PASSWORD in .env).
    @Value("${app.staff.bootstrap-username:}")
    private String bootstrapUsername;

    @Value("${app.staff.bootstrap-password:}")
    private String bootstrapPassword;

    /**
     * Creates the first staff account from deployment config, but only while there are no staff accounts.
     * An existing account is never recreated or reset from config.
     *
     * @return the created account, if one was created
     */
    @Transactional
    public Optional<StaffAccount> bootstrapFirstAccount() {
        if (staffAccountRepository.count() > 0) {
            return Optional.empty();
        }
        if (isBlank(bootstrapUsername) || isBlank(bootstrapPassword)) {
            log.warn("No staff accounts exist, so nobody can sign in to the staff app. Set "
                    + "APP_STAFF_BOOTSTRAP_USERNAME and APP_STAFF_BOOTSTRAP_PASSWORD (see .env.example) and restart.");
            return Optional.empty();
        }
        StaffAccount created = createAccount(bootstrapUsername, bootstrapPassword);
        log.info("Created first staff account '{}' from deployment config. "
                + "You can now remove APP_STAFF_BOOTSTRAP_PASSWORD from .env.", created.getUsername());
        return Optional.of(created);
    }

    @Transactional
    public StaffAccount createAccount(String username, String password) {
        String normalizedUsername = PasswordPolicy.normalizeAndValidateUsername(username);
        String normalizedPassword = PasswordPolicy.validateNewPassword(password, PasswordPolicy.STAFF_MIN_LENGTH);

        if (staffAccountRepository.existsByUsername(normalizedUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A staff account with that username already exists");
        }

        LocalDateTime now = LocalDateTime.now();
        return staffAccountRepository.save(StaffAccount.builder()
                .username(normalizedUsername)
                .passwordHash(loginGuard.hash(normalizedPassword))
                .locked(false)
                .failedLoginAttempts(0)
                .createdAt(now)
                .updatedAt(now)
                .build());
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public StaffAccount authenticate(String username, String password) {
        String normalized = PasswordPolicy.normalizeAndValidateUsername(username);
        String normalizedPassword = PasswordPolicy.normalizeLoginPassword(password);
        return loginGuard.authenticate(staffAccountRepository.findByUsername(normalized), normalizedPassword,
                staffAccountRepository, "Staff account is locked");
    }

    @Transactional
    public StaffAccount recordSuccessfulLogin(StaffAccount account, String ipAddress) {
        return loginGuard.recordSuccessfulLogin(account, ipAddress, staffAccountRepository);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
