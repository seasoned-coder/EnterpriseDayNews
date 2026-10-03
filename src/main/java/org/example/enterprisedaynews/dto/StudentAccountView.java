package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.StudentAccount;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import static org.example.enterprisedaynews.dto.ApiTimes.withServerOffset;

public record StudentAccountView(
        Long id,
        String username,
        boolean locked,
        boolean manuallyLocked,
        int failedLoginAttempts,
        OffsetDateTime temporaryLockUntil,
        OffsetDateTime lastLoginAt,
        String lastLoginIp,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
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
                withServerOffset(account.getTemporaryLockUntil()),
                withServerOffset(account.getLastLoginAt()),
                account.getLastLoginIp(),
                withServerOffset(account.getCreatedAt()),
                withServerOffset(account.getUpdatedAt())
        );
    }
}


