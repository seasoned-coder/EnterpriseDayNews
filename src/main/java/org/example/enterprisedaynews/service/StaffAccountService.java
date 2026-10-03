package org.example.enterprisedaynews.service;

import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.StaffAccount;
import org.example.enterprisedaynews.repository.StaffAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@Slf4j
public class StaffAccountService extends AccountService<StaffAccount> {

    // First staff account, supplied at deploy time (APP_STAFF_BOOTSTRAP_USERNAME / _PASSWORD in .env).
    @Value("${app.staff.bootstrap-username:}")
    private String bootstrapUsername;

    @Value("${app.staff.bootstrap-password:}")
    private String bootstrapPassword;

    public StaffAccountService(StaffAccountRepository repository, LoginGuard loginGuard) {
        super(repository, loginGuard, PasswordPolicy.STAFF_MIN_LENGTH, "staff");
    }

    @Override
    protected StaffAccount newAccount() {
        return new StaffAccount();
    }

    /**
     * Staff can't lock or delete their own account. That also guarantees at least one staff member
     * (the one acting) can always still sign in.
     */
    @Override
    protected void checkCanLockOrDelete(StaffAccount account, String actingUsername, String action) {
        if (account.getUsername().equals(PasswordPolicy.normalizeUsername(actingUsername))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You can't " + action + " your own account");
        }
    }

    /**
     * Creates the first staff account from deployment config, but only while there are no staff accounts.
     * An existing account is never recreated or reset from config.
     *
     * @return the created account, if one was created
     */
    @Transactional
    public Optional<StaffAccount> bootstrapFirstAccount() {
        if (repository.count() > 0) {
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

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
