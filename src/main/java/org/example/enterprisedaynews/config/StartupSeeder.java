package org.example.enterprisedaynews.config;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Ensures default singleton settings exist on startup. */
@Component
@RequiredArgsConstructor
public class StartupSeeder implements CommandLineRunner {

    private final DisplaySettingsService displaySettingsService;

    @Override
    public void run(String... args) {
        displaySettingsService.ensureSeeded();
    }
}
