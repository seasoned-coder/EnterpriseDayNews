package org.example.enterprisedaynews.controller;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

class ApiExceptionHandlerTests {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void ourReasonsAreSentAsPlainText() {
        ResponseEntity<String> response = handler.handle(new ResponseStatusException(HttpStatus.CONFLICT, "Taken"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_PLAIN);
        assertThat(response.getBody()).isEqualTo("Taken");
    }

    /** Issue #36: two staff saving the same username at the same moment get a friendly 409, not a 500. */
    @Test
    void clashingSameMomentChangesAreAConflict() {
        ResponseEntity<String> response = handler.handle(
                new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isEqualTo(ApiExceptionHandler.CLASHING_CHANGE)
                .doesNotContain("duplicate key");
    }
}
