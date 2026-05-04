package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtProvider jwtProvider;
    
    // Hardcoded credentials for the school event as requested.
    // In a production app, these would be in a database with hashed passwords.
    private static final Map<String, String> STUDENT_CREDS = Map.of(
        "student", "ed2026",
        "guest", "welcome"
    );
    
    private static final Map<String, String> STAFF_CREDS = Map.of(
        "staff1", "secret123",
        "admin", "enterprise-day-2026"
    );

    /**
     * Simple login for the school event. Verifies credentials against a hardcoded map.
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String role = request.get("role");
        String password = request.get("password");

        if (username == null || username.isBlank() || role == null || password == null || (!role.equals(Roles.STUDENT) && !role.equals(Roles.STAFF))) {
            return ResponseEntity.badRequest().build();
        }

        boolean authenticated = false;
        if (Roles.STUDENT.equals(role)) {
            authenticated = password.equals(STUDENT_CREDS.get(username.toLowerCase()));
        } else if (Roles.STAFF.equals(role)) {
            authenticated = password.equals(STAFF_CREDS.get(username.toLowerCase()));
        }

        if (!authenticated) {
            return ResponseEntity.status(401).build();
        }

        String token = jwtProvider.generateToken(username, role);
        return ResponseEntity.ok(Map.of("token", token));
    }
}
