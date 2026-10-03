package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for the student account management rules behind the
 * Student Account Dashboard (issue #11). Usernames are unique per test because
 * the in-memory database is shared across the Spring test context.
 */
@SpringBootTest
class StudentAccountServiceTests {

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    @Autowired
    private ImageRepository imageRepository;

    /** The staff member performing account changes. */
    private static final String STAFF = "staff.member";

    @Test
    void createAccountNormalisesUsernameAndHashesPassword() {
        StudentAccount account = studentAccountService.createAccount("  NewCo.Team-1 ", "Sunrise7");

        assertEquals("newco.team-1", account.getUsername());
        assertNotEquals("Sunrise7", account.getPasswordHash());
        assertTrue(account.getPasswordHash().startsWith("$2"));
        assertFalse(account.isLocked());
        assertNull(account.getLastLoginAt());
    }

    @Test
    void createAccountRejectsDuplicateUsernameCaseInsensitively() {
        studentAccountService.createAccount("dupeco", "Sunrise7");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.createAccount("DupeCo", "Another8"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void createAccountRejectsDuplicateOfLockedAccount() {
        StudentAccount locked = studentAccountService.createAccount("lockedco", "Sunrise7");
        studentAccountService.setLocked(locked.getId(), true, STAFF);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.createAccount("lockedco", "Another8"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void createAccountRejectsInvalidUsername() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.createAccount("bad name!", "Sunrise7"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void createAccountRejectsWeakPasswords() {
        // Too short, no uppercase, no digit, and on the common-password blocklist.
        for (String weak : new String[]{"Ab1", "alllower1", "NODIGITS", "Password1"}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> studentAccountService.createAccount("weakpwco", weak),
                    "expected rejection for " + weak);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        }
    }

    @Test
    void recordSuccessfulLoginStoresTimeAndIp() {
        StudentAccount account = studentAccountService.createAccount("loginco", "Sunrise7");
        LocalDateTime before = LocalDateTime.now().minusSeconds(1);

        studentAccountService.recordSuccessfulLogin(
                studentAccountService.authenticate("loginco", "Sunrise7"), " 203.0.113.7 ");

        StudentAccount refreshed = studentAccountRepository.findById(account.getId()).orElseThrow();
        assertNotNull(refreshed.getLastLoginAt());
        assertTrue(refreshed.getLastLoginAt().isAfter(before));
        assertEquals("203.0.113.7", refreshed.getLastLoginIp());
    }

    @Test
    void lockingBlocksLoginAndUnlockingRestoresIt() {
        StudentAccount account = studentAccountService.createAccount("toggleco", "Sunrise7");

        studentAccountService.setLocked(account.getId(), true, STAFF);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.authenticate("toggleco", "Sunrise7"));
        assertEquals(HttpStatus.LOCKED, ex.getStatusCode());

        studentAccountService.setLocked(account.getId(), false, STAFF);
        assertEquals("toggleco", studentAccountService.authenticate("toggleco", "Sunrise7").getUsername());
    }

    @Test
    void unlockingClearsTemporaryLockout() {
        StudentAccount account = studentAccountService.createAccount("templockco", "Sunrise7");
        account.setTemporaryLockUntil(LocalDateTime.now().plusMinutes(15));
        studentAccountRepository.save(account);

        assertThrows(ResponseStatusException.class,
                () -> studentAccountService.authenticate("templockco", "Sunrise7"));

        studentAccountService.setLocked(account.getId(), false, STAFF);
        assertEquals("templockco", studentAccountService.authenticate("templockco", "Sunrise7").getUsername());
    }

    @Test
    void changePasswordReplacesOldPassword() {
        StudentAccount account = studentAccountService.createAccount("pwchangeco", "Sunrise7");

        studentAccountService.changePassword(account.getId(), "Moonset9");

        assertEquals("pwchangeco", studentAccountService.authenticate("pwchangeco", "Moonset9").getUsername());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.authenticate("pwchangeco", "Sunrise7"));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void changePasswordRejectsWeakPassword() {
        StudentAccount account = studentAccountService.createAccount("pwweakco", "Sunrise7");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.changePassword(account.getId(), "short"));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void deleteAccountRemovesItAndFreesUsername() {
        StudentAccount account = studentAccountService.createAccount("deleteco", "Sunrise7");

        studentAccountService.deleteAccount(account.getId(), STAFF);

        assertTrue(studentAccountRepository.findByUsername("deleteco").isEmpty());
        assertDoesNotThrow(() -> studentAccountService.createAccount("deleteco", "Sunrise7"));
    }

    @Test
    void accountsStillUsingPublishedPasswordsAreLocked() {
        // Older versions created these accounts with passwords published in this repository.
        studentAccountRepository.findByUsername("student").ifPresent(studentAccountRepository::delete);
        studentAccountRepository.findByUsername("guest").ifPresent(studentAccountRepository::delete);
        StudentAccount stillPublished = studentAccountService.createAccount("student", "EdNews1");
        StudentAccount changed = studentAccountService.createAccount("guest", "Changed9");

        assertEquals(1, studentAccountService.lockAccountsWithPublishedPasswords());

        assertTrue(studentAccountRepository.findById(stillPublished.getId()).orElseThrow().isLocked());
        assertFalse(studentAccountRepository.findById(changed.getId()).orElseThrow().isLocked());
        // Running again changes nothing.
        assertEquals(0, studentAccountService.lockAccountsWithPublishedPasswords());

        studentAccountRepository.deleteById(stillPublished.getId());
        studentAccountRepository.deleteById(changed.getId());
    }

    @Test
    void renamingMovesTheStudentsUploadsWithThem() {
        StudentAccount account = studentAccountService.createAccount("old.team.name", "Sunrise7");
        ImageMetadata upload = imageRepository.save(ImageMetadata.builder()
                .filePath("rename-test.jpg").uploadedBy("old.team.name").status(ApprovalStatus.NEW).build());

        StudentAccount renamed = studentAccountService.renameAccount(account.getId(), "  New.Team.Name ");

        assertEquals("new.team.name", renamed.getUsername());
        assertEquals("new.team.name", imageRepository.findById(upload.getId()).orElseThrow().getUploadedBy());
        assertEquals("new.team.name", studentAccountService.authenticate("new.team.name", "Sunrise7").getUsername());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.authenticate("old.team.name", "Sunrise7")).getStatusCode());
        imageRepository.deleteById(upload.getId());
    }

    @Test
    void renameRefusesNamesAlreadyInUseEvenByLockedAccounts() {
        StudentAccount account = studentAccountService.createAccount("renamer", "Sunrise7");
        StudentAccount locked = studentAccountService.createAccount("locked.name", "Sunrise7");
        studentAccountService.setLocked(locked.getId(), true, STAFF);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> studentAccountService.renameAccount(account.getId(), "LOCKED.NAME"));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("already taken"));
        assertEquals("renamer", studentAccountRepository.findById(account.getId()).orElseThrow().getUsername());
    }

    @Test
    void renameValidatesTheNewName() {
        StudentAccount account = studentAccountService.createAccount("valid.name", "Sunrise7");

        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.renameAccount(account.getId(), "no spaces!")).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.renameAccount(account.getId(), "  ")).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.renameAccount(999_999L, "anything")).getStatusCode());
    }

    @Test
    void renamingToTheSameNameChangesNothingAndFreesNothing() {
        StudentAccount account = studentAccountService.createAccount("same.name", "Sunrise7");

        assertEquals("same.name", studentAccountService.renameAccount(account.getId(), "Same.Name").getUsername());
    }

    @Test
    void theOldNameCanBeReusedAfterARename() {
        StudentAccount account = studentAccountService.createAccount("reuse.me", "Sunrise7");
        studentAccountService.renameAccount(account.getId(), "reused.elsewhere");

        assertDoesNotThrow(() -> studentAccountService.createAccount("reuse.me", "Sunrise7"));
    }

    @Test
    void operationsOnMissingAccountReturnNotFound() {
        long missingId = 999_999L;
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.setLocked(missingId, true, STAFF)).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.changePassword(missingId, "Sunrise7")).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> studentAccountService.deleteAccount(missingId, STAFF)).getStatusCode());
    }
}
