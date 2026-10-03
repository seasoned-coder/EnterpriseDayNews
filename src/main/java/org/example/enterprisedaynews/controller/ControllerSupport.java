package org.example.enterprisedaynews.controller;

import jakarta.servlet.http.HttpServletRequest;

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

    /**
     * The client's IP address. Forwarding headers are resolved by Tomcat (server.forward-headers-strategy=native),
     * which only trusts them from internal proxies, so headers are deliberately not read here.
     */
    static String clientIpOf(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr == null || remoteAddr.isBlank()) ? null : remoteAddr.trim();
    }
}
