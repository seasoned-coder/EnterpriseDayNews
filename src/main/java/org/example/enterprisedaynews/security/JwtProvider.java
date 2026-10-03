package org.example.enterprisedaynews.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Set;

@Component
public class JwtProvider {

    /** HS256 needs a key of at least 256 bits. */
    static final int MIN_SECRET_BYTES = 32;

    /** Values that have been published in this (public) repository and must never sign real tokens. */
    private static final Set<String> KNOWN_PUBLIC_SECRETS = Set.of(
            "defaultSecretKeyThatIsAtLeast32CharactersLong"
    );

    // Deliberately no default: the secret must come from deployment config (APP_JWT_SECRET).
    @Value("${app.jwt.secret:}")
    private String secret;

    @Value("${app.jwt.expiration-ms:3600000}") // 1 hour
    private long expirationMs;

    private SecretKey secretKey;

    @PostConstruct
    void init() {
        secretKey = Keys.hmacShaKeyFor(validateSecret(secret).getBytes(StandardCharsets.UTF_8));
    }

    static String validateSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                    "No JWT signing secret configured. Set APP_JWT_SECRET (see .env.example).");
        }
        if (KNOWN_PUBLIC_SECRETS.contains(secret)) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET is a value published in the source code. Generate a new random secret.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes long.");
        }
        return secret;
    }

    public String generateToken(String username, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return getClaims(token).getSubject();
    }

    public String getRoleFromToken(String token) {
        return getClaims(token).get("role", String.class);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
