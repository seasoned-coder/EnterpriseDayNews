package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.live.LiveTopic;
import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.repository.DisplaySettingsRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DisplaySettingsService {

    /** Allowed ranges, so a typo can't freeze or flood the projector. */
    public static final int MIN_STAFF_INTERVAL_SECONDS = 0, MAX_STAFF_INTERVAL_SECONDS = 3600;
    public static final int MIN_STAFF_ITEM_SECONDS = 3, MAX_STAFF_ITEM_SECONDS = 120;
    public static final int MIN_REFRESH_SECONDS = 2, MAX_REFRESH_SECONDS = 60;

    private final DisplaySettingsRepository repository;
    private final ApplicationEventPublisher events;

    public DisplaySettings get() {
        return repository.findById(DisplaySettings.DEFAULT_ID).orElseGet(DisplaySettings::defaults);
    }

    @Transactional
    public DisplaySettings update(DisplaySettings incoming) {
        requireInRange("Staff content interval", incoming.getIntervalSpeedSeconds(),
                MIN_STAFF_INTERVAL_SECONDS, MAX_STAFF_INTERVAL_SECONDS);
        requireInRange("Staff item display time", incoming.getDisplayDurationSeconds(),
                MIN_STAFF_ITEM_SECONDS, MAX_STAFF_ITEM_SECONDS);
        requireInRange("Projector refresh", incoming.getImageRefreshSeconds(),
                MIN_REFRESH_SECONDS, MAX_REFRESH_SECONDS);
        // Force singleton id; ignore any client-supplied value.
        incoming.setId(DisplaySettings.DEFAULT_ID);
        return changed(repository.save(incoming));
    }

    /** Puts the projector settings back to their defaults (part of resetting the event). */
    @Transactional
    public DisplaySettings resetToDefaults() {
        return changed(repository.save(DisplaySettings.defaults()));
    }

    /** The projector picks up new settings straight away (issue #43). */
    private DisplaySettings changed(DisplaySettings settings) {
        events.publishEvent(new LiveTopic.Changed(LiveTopic.PROJECTOR_SETTINGS));
        return settings;
    }

    /** Ensures a settings row always exists (called at startup). */
    @Transactional
    public DisplaySettings ensureSeeded() {
        return repository.findById(DisplaySettings.DEFAULT_ID)
                .orElseGet(() -> repository.save(DisplaySettings.defaults()));
    }

    private static void requireInRange(String name, int value, int min, int max) {
        if (value < min || value > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    name + " must be between " + min + " and " + max + " seconds");
        }
    }
}
