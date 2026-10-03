package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StaffAccountService staffAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    private ResultActions login(String username, String password, String role) throws Exception {
        StringBuilder body = new StringBuilder("{");
        if (username != null) {
            body.append("\"username\": \"").append(username).append("\", ");
        }
        body.append("\"role\": \"").append(role).append("\", \"password\": \"").append(password).append("\"}");
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body.toString()));
    }

    @Test
    void testLoginSuccess() throws Exception {
        studentAccountService.createAccount("authco", "EdNews7");

        login("AuthCo", "EdNews7", Roles.STUDENT)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.username").value("authco"))
                .andExpect(jsonPath("$.role").value(Roles.STUDENT));
    }

    @Test
    void testLoginWrongPassword() throws Exception {
        studentAccountService.createAccount("wrongpwco", "EdNews7");

        login("wrongpwco", "wrong", Roles.STUDENT)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testLoginInvalidRole() throws Exception {
        login("student", "EdNews1", "INVALID")
                .andExpect(status().isBadRequest());
    }

    @Test
    void testLoginMissingUsername() throws Exception {
        login(null, "EdNews1", Roles.STUDENT)
                .andExpect(status().isBadRequest());
    }

    @Test
    void testPublishedDefaultStudentAccountsAreNotCreated() throws Exception {
        login("student", "EdNews1", Roles.STUDENT).andExpect(status().isUnauthorized());
        login("guest", "Guest1A", Roles.STUDENT).andExpect(status().isUnauthorized());
    }

    @Test
    void testLockedStudentAccountCannotLogin() throws Exception {
        var account = studentAccountService.createAccount("lockeduser", "Secret123");
        studentAccountService.setLocked(account.getId(), true, "staff.member");

        login("lockeduser", "Secret123", Roles.STUDENT)
                .andExpect(status().isLocked());
    }

    @Test
    void testTemporaryLockAfterFiveFailedAttempts() throws Exception {
        studentAccountService.createAccount("ratelimit", "Secure1");

        for (int i = 0; i < 4; i++) {
            login("ratelimit", "Wrong1", Roles.STUDENT).andExpect(status().isUnauthorized());
        }
        login("ratelimit", "Wrong1", Roles.STUDENT).andExpect(status().isLocked());

        login("ratelimit", "Secure1", Roles.STUDENT).andExpect(status().isLocked());
    }

    @Test
    void testLegacyPlaintextStudentPasswordIsUpgradedOnLogin() throws Exception {
        var account = studentAccountService.createAccount("legacyuser", "Legacy1");
        account.setPasswordHash("Legacy1");
        studentAccountRepository.save(account);

        login("legacyuser", "Legacy1", Roles.STUDENT)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("legacyuser"));

        var refreshed = studentAccountRepository.findByUsername("legacyuser").orElseThrow();
        assertNotEquals("Legacy1", refreshed.getPasswordHash());
        assertTrue(refreshed.getPasswordHash().startsWith("$2"));
    }

    @Test
    void testStaffLoginUsesDatabaseAccount() throws Exception {
        staffAccountService.createAccount("Teacher.One", "Staffroom42");

        login("teacher.one", "Staffroom42", Roles.STAFF)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.username").value("teacher.one"))
                .andExpect(jsonPath("$.role").value(Roles.STAFF));
    }

    @Test
    void testStaffLoginWrongPassword() throws Exception {
        staffAccountService.createAccount("teacher.two", "Staffroom42");

        login("teacher.two", "Staffroom43", Roles.STAFF)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testFormerHardCodedStaffCredentialsNoLongerWork() throws Exception {
        login("admin", "enterprise-day-2026", Roles.STAFF).andExpect(status().isUnauthorized());
        login("staff1", "secret123", Roles.STAFF).andExpect(status().isUnauthorized());
    }

    @Test
    void testStudentAccountCannotSignInAsStaff() throws Exception {
        studentAccountService.createAccount("notstaff", "EdNews7");

        login("notstaff", "EdNews7", Roles.STAFF)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testStaffTemporaryLockAfterFiveFailedAttempts() throws Exception {
        staffAccountService.createAccount("teacher.three", "Staffroom42");

        for (int i = 0; i < 4; i++) {
            login("teacher.three", "Wrong12345", Roles.STAFF).andExpect(status().isUnauthorized());
        }
        login("teacher.three", "Wrong12345", Roles.STAFF).andExpect(status().isLocked());
        login("teacher.three", "Staffroom42", Roles.STAFF).andExpect(status().isLocked());
    }
}
