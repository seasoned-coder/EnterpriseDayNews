package org.example.enterprisedaynews.service;

import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

/**
 * Enforces valid {@link ApprovalStatus} transitions for an image.
 *
 * <p>Allowed transitions:
 * <ul>
 *     <li>{@code NEW      -> APPROVED, REJECTED}</li>
 *     <li>{@code APPROVED -> REJECTED} (staff changes their mind)</li>
 *     <li>{@code REJECTED -> APPROVED} (staff changes their mind)</li>
 * </ul>
 *
 * <p>Self-transitions (e.g. {@code APPROVED -> APPROVED}) and any move back to
 * {@code NEW} are rejected — once an image has been vetted it cannot return to
 * the unvetted queue.
 */
public final class ImageStateMachine {

    private static final Map<ApprovalStatus, Set<ApprovalStatus>> ALLOWED;

    static {
        ALLOWED = new EnumMap<>(ApprovalStatus.class);
        ALLOWED.put(ApprovalStatus.NEW, Set.of(ApprovalStatus.APPROVED, ApprovalStatus.REJECTED));
        ALLOWED.put(ApprovalStatus.APPROVED, Set.of(ApprovalStatus.REJECTED));
        ALLOWED.put(ApprovalStatus.REJECTED, Set.of(ApprovalStatus.APPROVED));
    }

    private ImageStateMachine() {
    }

    /**
     * @return {@code true} if {@code from -> to} is a permitted transition.
     */
    public static boolean canTransition(ApprovalStatus from, ApprovalStatus to) {
        if (from == null || to == null) {
            return false;
        }
        return ALLOWED.getOrDefault(from, Set.of()).contains(to);
    }

    /**
     * Validates that {@code from -> to} is allowed, throwing a 409 CONFLICT
     * {@link ResponseStatusException} otherwise.
     */
    public static void assertCanTransition(ApprovalStatus from, ApprovalStatus to) {
        if (!canTransition(from, to)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Illegal status transition: " + from + " -> " + to);
        }
    }
}
