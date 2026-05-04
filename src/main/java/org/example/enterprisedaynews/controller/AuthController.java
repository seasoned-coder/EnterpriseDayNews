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

    /**
     * Simple login for the school event. In a real app, this would verify credentials.
     * Here we just take username and role to issue a token for the UI to use.
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String role = request.get("role");

        if (username == null || username.isBlank() || role == null || (!role.equals(Roles.STUDENT) && !role.equals(Roles.STAFF))) {
            return ResponseEntity.badRequest().build();
        }

        String token = jwtProvider.generateToken(username, role);
        return ResponseEntity.ok(Map.of("token", token));
    }
}
