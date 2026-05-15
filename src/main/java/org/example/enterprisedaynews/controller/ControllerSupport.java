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

    static String clientIpOf(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        String remoteAddr = request.getRemoteAddr();
        return (remoteAddr == null || remoteAddr.isBlank()) ? null : remoteAddr.trim();
    }
}
