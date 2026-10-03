package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resets the event (issue #34): deletes every student advert and puts the projector settings back to
 * their defaults. Staff information items and all accounts are kept.
 */
@Service
@RequiredArgsConstructor
public class EventResetService {

    private final ImageService imageService;
    private final DisplaySettingsService displaySettingsService;

    /** What a reset did, for the confirmation message. */
    public record Result(int deletedAdverts) {
    }

    @Transactional
    public Result resetEvent() {
        int deleted = imageService.deleteAllAdverts();
        displaySettingsService.resetToDefaults();
        return new Result(deleted);
    }
}
