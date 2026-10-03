package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.LoginAccount;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import static org.example.enterprisedaynews.dto.ApiTimes.withServerOffset;

/** API view of a student or staff account. Never includes the password hash. */
public record AccountView(
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
    public static AccountView from(LoginAccount account) {
        boolean temporaryLocked = account.getTemporaryLockUntil() != null
                && account.getTemporaryLockUntil().isAfter(LocalDateTime.now());
        return new AccountView(
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
