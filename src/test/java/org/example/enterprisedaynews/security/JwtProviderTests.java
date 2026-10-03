package org.example.enterprisedaynews.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtProviderTests {

    private static final String SECRET_A = "a-test-secret-that-is-long-enough-0001";
    private static final String SECRET_B = "b-test-secret-that-is-long-enough-0002";

    private static JwtProvider providerWith(String secret) {
        JwtProvider provider = new JwtProvider(secret);
        ReflectionTestUtils.setField(provider, "expirationMs", 60_000L);
        return provider;
    }

    @Test
    void issuedTokenRoundTrips() {
        JwtProvider provider = providerWith(SECRET_A);
        String token = provider.generateToken("admin", Roles.STAFF);

        assertTrue(provider.validateToken(token));
        assertEquals("admin", provider.getUsernameFromToken(token));
        assertEquals(Roles.STAFF, provider.getRoleFromToken(token));
    }

    @Test
    void rejectsTokenSignedWithDifferentSecret() {
        String forged = providerWith(SECRET_B).generateToken("admin", Roles.STAFF);

        assertFalse(providerWith(SECRET_A).validateToken(forged));
    }

    @Test
    void rejectsTamperedOrMalformedToken() {
        JwtProvider provider = providerWith(SECRET_A);
        String token = provider.generateToken("student", Roles.STUDENT);
        String tampered = token.substring(0, token.length() - 2) + (token.endsWith("A") ? "BB" : "AA");

        assertFalse(provider.validateToken(tampered));
        assertFalse(provider.validateToken("not-a-jwt"));
    }

    @Test
    void rejectsExpiredToken() {
        JwtProvider provider = providerWith(SECRET_A);
        ReflectionTestUtils.setField(provider, "expirationMs", -1_000L);
        String expired = provider.generateToken("student", Roles.STUDENT);

        assertFalse(provider.validateToken(expired));
    }
}
