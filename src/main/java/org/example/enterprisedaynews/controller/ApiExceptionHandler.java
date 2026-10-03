package org.example.enterprisedaynews.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sends the reason of a {@link ResponseStatusException} back as plain text so the UI can show it
 * (e.g. "A student account with that username already exists"). These reasons are written by us for
 * users; Spring's default error body omits them. Unexpected exceptions still get the generic error page.
 */
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<String> handle(ResponseStatusException ex) {
        String reason = ex.getReason() != null ? ex.getReason() : "";
        return ResponseEntity.status(ex.getStatusCode())
                .contentType(MediaType.TEXT_PLAIN)
                .body(reason);
    }

    /**
     * Two people saving clashing changes at the same moment, e.g. two staff creating the same username: the
     * "already exists" check passed for both and the database refused the second (issue #36).
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<String> handle(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .contentType(MediaType.TEXT_PLAIN)
                .body(CLASHING_CHANGE);
    }

    static final String CLASHING_CHANGE =
            "Someone else just made a change that clashes with this one (for example, took that username). "
                    + "Refresh and try again.";
}
