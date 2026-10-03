package org.example.enterprisedaynews;

import org.example.enterprisedaynews.repository.AppSecretRepository;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The app starts with no APP_JWT_SECRET at all: it generates one and keeps it in the database. */
@SpringBootTest(properties = "app.jwt.secret=")
class GeneratedSigningSecretTests {

    @Autowired
    private AppSecretRepository appSecretRepository;

    @Autowired
    private JwtProvider jwtProvider;

    @Test
    void startsWithoutAConfiguredSecret() {
        assertEquals(1, appSecretRepository.count());
        String token = jwtProvider.generateToken("head.teacher", Roles.STAFF);
        assertTrue(jwtProvider.validateToken(token));
    }
}
