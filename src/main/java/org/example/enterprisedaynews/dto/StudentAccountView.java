package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.StudentAccount;

import java.time.LocalDateTime;

public record StudentAccountView(
        Long id,
        String username,
        boolean locked,
        boolean manuallyLocked,
        int failedLoginAttempts,
        LocalDateTime temporaryLockUntil,
        LocalDateTime lastLoginAt,
        String lastLoginIp,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static StudentAccountView from(StudentAccount account) {
        boolean temporaryLocked = account.getTemporaryLockUntil() != null
                && account.getTemporaryLockUntil().isAfter(LocalDateTime.now());
        return new StudentAccountView(
                account.getId(),
                account.getUsername(),
                account.isLocked() || temporaryLocked,
                account.isLocked(),
                account.getFailedLoginAttempts(),
                account.getTemporaryLockUntil(),
                account.getLastLoginAt(),
                account.getLastLoginIp(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }
}


