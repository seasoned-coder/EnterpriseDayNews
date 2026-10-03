package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.StaffAccount;
import org.example.enterprisedaynews.repository.StaffAccountRepository;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/** Staff accounts live in the database (issue #30); the first one comes from deployment config. */
@SpringBootTest
class StaffAccountServiceTests {

    @Autowired
    private StaffAccountService staffAccountService;

    @Autowired
    private StaffAccountRepository staffAccountRepository;

    @BeforeEach
    void clearStaffAccounts() {
        // Bootstrap only runs while the table is empty, so start each test from that state.
        staffAccountRepository.deleteAll();
    }

    @AfterEach
    void clearBootstrapConfig() {
        setBootstrapConfig("", "");
    }

    private void setBootstrapConfig(String username, String password) {
        ReflectionTestUtils.setField(staffAccountService, "bootstrapUsername", username);
        ReflectionTestUtils.setField(staffAccountService, "bootstrapPassword", password);
    }

    @Test
    void bootstrapCreatesFirstAccountFromConfig() {
        setBootstrapConfig(" Head.Teacher ", "Staffroom42");

        Optional<StaffAccount> created = staffAccountService.bootstrapFirstAccount();

        assertTrue(created.isPresent());
        assertEquals("head.teacher", created.get().getUsername());
        assertTrue(created.get().getPasswordHash().startsWith("$2"));
        assertEquals("head.teacher", staffAccountService.authenticate("head.teacher", "Staffroom42").getUsername());
    }

    @Test
    void bootstrapNeverTouchesExistingAccounts() {
        staffAccountService.createAccount("existing", "Staffroom42");
        setBootstrapConfig("existing", "Different99X");

        assertTrue(staffAccountService.bootstrapFirstAccount().isEmpty());
        assertEquals(1, staffAccountRepository.count());
        // The configured password must not have replaced the real one.
        assertEquals("existing", staffAccountService.authenticate("existing", "Staffroom42").getUsername());
    }

    @Test
    void bootstrapDoesNothingWithoutConfig() {
        setBootstrapConfig("", "");
        assertTrue(staffAccountService.bootstrapFirstAccount().isEmpty());

        setBootstrapConfig("someone", "");
        assertTrue(staffAccountService.bootstrapFirstAccount().isEmpty());

        assertEquals(0, staffAccountRepository.count());
    }

    @Test
    void bootstrapRejectsWeakPassword() {
        setBootstrapConfig("head.teacher", "Short1");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> staffAccountService.bootstrapFirstAccount());
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals(0, staffAccountRepository.count());
    }

    @Test
    void staffPasswordsNeedTenCharactersCapitalAndNumber() {
        for (String weak : new String[]{"Staffroom", "staffroom42", "Staff42"}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> staffAccountService.createAccount("weakstaff", weak), "expected rejection for " + weak);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        }
        assertDoesNotThrow(() -> staffAccountService.createAccount("weakstaff", "Staffroom42"));
    }

    @Test
    void duplicateStaffUsernameRejected() {
        staffAccountService.createAccount("dupe.staff", "Staffroom42");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> staffAccountService.createAccount("Dupe.Staff", "Staffroom43"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void lockedStaffAccountCannotSignIn() {
        StaffAccount account = staffAccountService.createAccount("locked.staff", "Staffroom42");
        account.setLocked(true);
        staffAccountRepository.save(account);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> staffAccountService.authenticate("locked.staff", "Staffroom42"));
        assertEquals(HttpStatus.LOCKED, ex.getStatusCode());
    }

    @Test
    void unknownStaffUsernameIsUnauthorized() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> staffAccountService.authenticate("nobody", "Staffroom42"));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void listsAccountsAlphabetically() {
        staffAccountService.createAccount("zed.staff", "Staffroom42");
        staffAccountService.createAccount("amy.staff", "Staffroom42");

        assertEquals(List.of("amy.staff", "zed.staff"),
                staffAccountService.listAccounts().stream().map(StaffAccount::getUsername).toList());
    }

    @Test
    void staffCanLockAndUnlockOtherStaff() {
        staffAccountService.createAccount("head.teacher", "Staffroom42");
        StaffAccount other = staffAccountService.createAccount("supply.teacher", "Staffroom42");

        staffAccountService.setLocked(other.getId(), true, "head.teacher");
        assertTrue(staffAccountService.findActiveAccount("supply.teacher").isEmpty());
        assertEquals(HttpStatus.LOCKED, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.authenticate("supply.teacher", "Staffroom42")).getStatusCode());

        staffAccountService.setLocked(other.getId(), false, "head.teacher");
        assertTrue(staffAccountService.findActiveAccount("Supply.Teacher").isPresent());
    }

    @Test
    void youCannotLockOrDeleteYourself() {
        StaffAccount me = staffAccountService.createAccount("head.teacher", "Staffroom42");

        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.setLocked(me.getId(), true, "Head.Teacher")).getStatusCode());
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.deleteAccount(me.getId(), "head.teacher")).getStatusCode());
        assertTrue(staffAccountService.findActiveAccount("head.teacher").isPresent());
    }

    @Test
    void staffCanDeleteOtherStaff() {
        staffAccountService.createAccount("head.teacher", "Staffroom42");
        StaffAccount leaver = staffAccountService.createAccount("leaver", "Staffroom42");

        staffAccountService.deleteAccount(leaver.getId(), "head.teacher");

        assertTrue(staffAccountRepository.findByUsername("leaver").isEmpty());
        assertTrue(staffAccountService.findActiveAccount("leaver").isEmpty());
    }

    @Test
    void passwordResetUsesStaffRules() {
        StaffAccount account = staffAccountService.createAccount("reset.me", "Staffroom42");

        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.changePassword(account.getId(), "Short1")).getStatusCode());

        staffAccountService.changePassword(account.getId(), "NewStaffroom7");
        assertEquals("reset.me", staffAccountService.authenticate("reset.me", "NewStaffroom7").getUsername());
    }

    @Test
    void missingStaffAccountIsNotFound() {
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.setLocked(999_999L, true, "someone")).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.changePassword(999_999L, "Staffroom42")).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> staffAccountService.deleteAccount(999_999L, "someone")).getStatusCode());
        assertTrue(staffAccountService.findActiveAccount("  ").isEmpty());
    }

    @Test
    void recordSuccessfulLoginStoresTimeAndIp() {
        StaffAccount account = staffAccountService.createAccount("login.staff", "Staffroom42");
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        staffAccountService.recordSuccessfulLogin(
                staffAccountService.authenticate("login.staff", "Staffroom42"), "198.51.100.4");

        StaffAccount refreshed = staffAccountRepository.findById(account.getId()).orElseThrow();
        assertTrue(refreshed.getLastLoginAt().isAfter(before));
        assertEquals("198.51.100.4", refreshed.getLastLoginIp());
    }
}
