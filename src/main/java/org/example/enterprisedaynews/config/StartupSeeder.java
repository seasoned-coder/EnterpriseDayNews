package org.example.enterprisedaynews.config;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Startup tasks: default settings, the first staff account, and locking accounts with published passwords. */
@Component
@RequiredArgsConstructor
public class StartupSeeder implements CommandLineRunner {

    private final DisplaySettingsService displaySettingsService;
    private final StaffAccountService staffAccountService;
    private final StudentAccountService studentAccountService;

    @Override
    public void run(String... args) {
        displaySettingsService.ensureSeeded();
        staffAccountService.bootstrapFirstAccount();
        studentAccountService.lockAccountsWithPublishedPasswords();
    }
}
