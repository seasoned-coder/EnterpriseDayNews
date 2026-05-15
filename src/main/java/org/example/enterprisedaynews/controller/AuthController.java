package org.example.enterprisedaynews.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtProvider jwtProvider;
    private final StudentAccountService studentAccountService;

    // Staff credentials remain fixed for the event admin console.
    private static final Map<String, String> STAFF_CREDS = Map.of(
        "staff1", "secret123",
        "admin", "enterprise-day-2026"
    );

    /**
     * Simple login for the school event. Verifies credentials against a hardcoded map.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpServletRequest servletRequest) {
        String username = request.get("username");
        String role = request.get("role");
        String password = request.get("password");

        if (username == null || username.isBlank() || role == null || password == null || (!role.equals(Roles.STUDENT) && !role.equals(Roles.STAFF))) {
            return ResponseEntity.badRequest().body("Invalid login request");
        }

        String canonicalUsername = username.trim().toLowerCase();
        if (Roles.STUDENT.equals(role)) {
            try {
                canonicalUsername = studentAccountService
                        .recordSuccessfulLogin(
                                studentAccountService.authenticate(username, password),
                                ControllerSupport.clientIpOf(servletRequest))
                        .getUsername();
            } catch (ResponseStatusException ex) {
                return ResponseEntity.status(ex.getStatusCode()).body(ex.getReason());
            }
        } else {
            boolean authenticated = password.equals(STAFF_CREDS.get(canonicalUsername));
            if (!authenticated) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
            }
        }

        String token = jwtProvider.generateToken(canonicalUsername, role);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", canonicalUsername,
                "role", role
        ));
    }
}
