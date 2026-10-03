package org.example.enterprisedaynews;

import org.example.enterprisedaynews.repository.StaffAccountRepository;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.springframework.context.ApplicationContext;

/**
 * Tokens are only honoured for accounts that exist and aren't locked, so tests that act as staff
 * need a real staff account behind their token.
 */
public final class TestAccounts {

    private TestAccounts() {
    }

    /** Ensures the staff account exists and returns an "Authorization" header value for it. */
    public static String staffBearer(ApplicationContext context, String username) {
        StaffAccountRepository repository = context.getBean(StaffAccountRepository.class);
        if (!repository.existsByUsername(username)) {
            context.getBean(StaffAccountService.class).createAccount(username, "TestStaff123");
        }
        return "Bearer " + context.getBean(JwtProvider.class).generateToken(username, Roles.STAFF);
    }
}
