package org.example.enterprisedaynews.security;

import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.AppSecret;
import org.example.enterprisedaynews.repository.AppSecretRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Set;

/**
 * The secret that signs login tokens (and, derived from it, image links).
 * <p>
 * If {@code APP_JWT_SECRET} is set it is validated and used. Otherwise a strong random secret is
 * generated on first start and stored in the database, so nobody has to create or remember one and it
 * survives restarts. Deleting the {@code app_secrets} row (or wiping the database) signs everyone out.
 */
@Component
@Slf4j
public class SigningSecret {

    /** HS256 needs a key of at least 256 bits. */
    static final int MIN_SECRET_BYTES = 32;

    static final String DB_NAME = "jwt-signing-secret";

    /** Values that have been published in this (public) repository and must never sign real tokens. */
    private static final Set<String> KNOWN_PUBLIC_SECRETS = Set.of(
            "defaultSecretKeyThatIsAtLeast32CharactersLong"
    );

    private final String value;

    public SigningSecret(@Value("${app.jwt.secret:}") String configured, AppSecretRepository repository) {
        if (configured != null && !configured.isBlank()) {
            this.value = validate(configured);
        } else {
            this.value = repository.findById(DB_NAME)
                    .map(AppSecret::getValue)
                    .orElseGet(() -> {
                        log.info("No APP_JWT_SECRET set: generated a signing secret and stored it in the database.");
                        return repository.save(new AppSecret(DB_NAME, generate(), LocalDateTime.now())).getValue();
                    });
        }
    }

    public String value() {
        return value;
    }

    static String validate(String secret) {
        if (KNOWN_PUBLIC_SECRETS.contains(secret)) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET is a value published in the source code. Remove it to have one generated, or set a new random value.");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes long (or remove it to have one generated).");
        }
        return secret;
    }

    private static String generate() {
        byte[] bytes = new byte[48];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
