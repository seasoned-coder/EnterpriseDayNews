package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.repository.DisplaySettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DisplaySettingsService {

    private final DisplaySettingsRepository repository;

    public DisplaySettings get() {
        return repository.findById(DisplaySettings.DEFAULT_ID).orElseGet(DisplaySettings::defaults);
    }

    @Transactional
    public DisplaySettings update(DisplaySettings incoming) {
        // Force singleton id; ignore any client-supplied value.
        incoming.setId(DisplaySettings.DEFAULT_ID);
        return repository.save(incoming);
    }

    /** Ensures a settings row always exists (called at startup). */
    @Transactional
    public DisplaySettings ensureSeeded() {
        return repository.findById(DisplaySettings.DEFAULT_ID)
                .orElseGet(() -> repository.save(DisplaySettings.defaults()));
    }
}
