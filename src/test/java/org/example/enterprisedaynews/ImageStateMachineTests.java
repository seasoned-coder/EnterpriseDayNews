package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.service.ImageStateMachine;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

class ImageStateMachineTests {

    @Test
    void allowsNewToApprovedAndRejected() {
        assertTrue(ImageStateMachine.canTransition(ApprovalStatus.NEW, ApprovalStatus.APPROVED));
        assertTrue(ImageStateMachine.canTransition(ApprovalStatus.NEW, ApprovalStatus.REJECTED));
    }

    @Test
    void allowsApprovedAndRejectedToFlip() {
        assertTrue(ImageStateMachine.canTransition(ApprovalStatus.APPROVED, ApprovalStatus.REJECTED));
        assertTrue(ImageStateMachine.canTransition(ApprovalStatus.REJECTED, ApprovalStatus.APPROVED));
    }

    @Test
    void disallowsSelfTransitions() {
        for (ApprovalStatus s : ApprovalStatus.values()) {
            assertFalse(ImageStateMachine.canTransition(s, s), "self-transition should be illegal: " + s);
        }
    }

    @Test
    void disallowsReturningToNew() {
        assertFalse(ImageStateMachine.canTransition(ApprovalStatus.APPROVED, ApprovalStatus.NEW));
        assertFalse(ImageStateMachine.canTransition(ApprovalStatus.REJECTED, ApprovalStatus.NEW));
    }

    @Test
    void disallowsNullStates() {
        assertFalse(ImageStateMachine.canTransition(null, ApprovalStatus.APPROVED));
        assertFalse(ImageStateMachine.canTransition(ApprovalStatus.NEW, null));
        assertFalse(ImageStateMachine.canTransition(null, null));
    }

    @Test
    void assertCanTransitionThrowsOnIllegal() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> ImageStateMachine.assertCanTransition(ApprovalStatus.APPROVED, ApprovalStatus.APPROVED));
        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void assertCanTransitionPassesOnLegal() {
        assertDoesNotThrow(() -> ImageStateMachine.assertCanTransition(
                ApprovalStatus.NEW, ApprovalStatus.APPROVED));
    }
}
