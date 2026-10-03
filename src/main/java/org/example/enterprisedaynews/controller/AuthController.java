package org.example.enterprisedaynews.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.example.enterprisedaynews.service.StudentAccountService;
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
    private final StaffAccountService staffAccountService;

    /**
     * Signs a student or staff member in against their database account and returns a JWT for that role.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpServletRequest servletRequest) {
        String username = request.get("username");
        String role = request.get("role");
        String password = request.get("password");

        if (username == null || username.isBlank() || role == null || password == null || (!role.equals(Roles.STUDENT) && !role.equals(Roles.STAFF))) {
            return ResponseEntity.badRequest().body("Invalid login request");
        }

        String clientIp = ControllerSupport.clientIpOf(servletRequest);
        String canonicalUsername;
        try {
            canonicalUsername = Roles.STUDENT.equals(role)
                    ? studentAccountService.recordSuccessfulLogin(
                            studentAccountService.authenticate(username, password), clientIp).getUsername()
                    : staffAccountService.recordSuccessfulLogin(
                            staffAccountService.authenticate(username, password), clientIp).getUsername();
        } catch (ResponseStatusException ex) {
            return ResponseEntity.status(ex.getStatusCode()).body(ex.getReason());
        }

        String token = jwtProvider.generateToken(canonicalUsername, role);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", canonicalUsername,
                "role", role
        ));
    }
}
