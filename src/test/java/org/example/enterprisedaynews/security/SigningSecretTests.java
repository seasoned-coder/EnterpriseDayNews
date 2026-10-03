package org.example.enterprisedaynews.security;

import org.example.enterprisedaynews.model.AppSecret;
import org.example.enterprisedaynews.repository.AppSecretRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** No secret has to be configured: one is generated once and kept in the database. */
class SigningSecretTests {

    private final AppSecretRepository repository = mock(AppSecretRepository.class);

    @Test
    void generatesAndStoresASecretWhenNoneIsConfigured() {
        when(repository.findById(SigningSecret.DB_NAME)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String generated = new SigningSecret("", repository).value();

        assertTrue(generated.length() >= SigningSecret.MIN_SECRET_BYTES, "strong enough for HS256");
        verify(repository).save(argThat(s -> s.getName().equals(SigningSecret.DB_NAME) && s.getValue().equals(generated)));
    }

    @Test
    void reusesTheStoredSecretAfterARestart() {
        when(repository.findById(SigningSecret.DB_NAME))
                .thenReturn(Optional.of(new AppSecret(SigningSecret.DB_NAME, "stored-secret-value-from-first-start-xyz", LocalDateTime.now())));

        assertEquals("stored-secret-value-from-first-start-xyz", new SigningSecret(null, repository).value());
        verify(repository, never()).save(any());
    }

    @Test
    void generatedSecretsAreRandom() {
        when(repository.findById(SigningSecret.DB_NAME)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertNotEquals(new SigningSecret("", repository).value(), new SigningSecret("", repository).value());
    }

    @Test
    void aConfiguredSecretWinsAndIsNotStored() {
        String configured = "configured-secret-that-is-long-enough-123";

        assertEquals(configured, new SigningSecret(configured, repository).value());
        verifyNoInteractions(repository);
    }

    @Test
    void rejectsWeakOrPublishedConfiguredSecrets() {
        assertThrows(IllegalStateException.class, () -> new SigningSecret("too-short", repository));
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> new SigningSecret("defaultSecretKeyThatIsAtLeast32CharactersLong", repository));
        assertTrue(ex.getMessage().contains("published"));
    }
}
