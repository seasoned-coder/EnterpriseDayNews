package org.example.enterprisedaynews.controller;

import java.security.Principal;

/** Shared helpers for REST controllers. */
final class ControllerSupport {

    private ControllerSupport() {
    }

    static String usernameOf(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            return "anonymous";
        }
        return principal.getName();
    }
}
