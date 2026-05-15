package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StudentAccountService studentAccountService;

    @Test
    void testLoginSuccess() throws Exception {
        String body = "{\"username\": \"student\", \"role\": \"" + Roles.STUDENT + "\", \"password\": \"EdNews1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.username").value("student"))
                .andExpect(jsonPath("$.role").value(Roles.STUDENT));
    }

    @Test
    void testLoginWrongPassword() throws Exception {
        String body = "{\"username\": \"student\", \"role\": \"" + Roles.STUDENT + "\", \"password\": \"wrong\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testLoginInvalidRole() throws Exception {
        String body = "{\"username\": \"student\", \"role\": \"INVALID\", \"password\": \"EdNews1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testLoginMissingUsername() throws Exception {
        String body = "{\"role\": \"" + Roles.STUDENT + "\", \"password\": \"EdNews1\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testLockedStudentAccountCannotLogin() throws Exception {
        var account = studentAccountService.createAccount("lockeduser", "Secret123");
        studentAccountService.setLocked(account.getId(), true);

        String body = "{\"username\": \"lockeduser\", \"role\": \"" + Roles.STUDENT + "\", \"password\": \"Secret123\"}";
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isLocked());
    }

    @Test
    void testTemporaryLockAfterFiveFailedAttempts() throws Exception {
        studentAccountService.createAccount("ratelimit", "Secure1");
        String wrongPasswordBody = "{\"username\": \"ratelimit\", \"role\": \"" + Roles.STUDENT + "\", \"password\": \"Wrong1\"}";

        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(wrongPasswordBody))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(wrongPasswordBody))
                .andExpect(status().isLocked());

        String correctPasswordBody = "{\"username\": \"ratelimit\", \"role\": \"" + Roles.STUDENT + "\", \"password\": \"Secure1\"}";
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(correctPasswordBody))
                .andExpect(status().isLocked());
    }
}
