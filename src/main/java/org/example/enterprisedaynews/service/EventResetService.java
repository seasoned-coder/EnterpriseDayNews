package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resets the event (issue #34): deletes every student advert and its recorded screen time (#40), ends any
 * price wobble (#41), clears every team's balance and payments (#48), and puts the projector settings back to
 * their defaults. Staff information items and all accounts are kept.
 */
@Service
@RequiredArgsConstructor
public class EventResetService {

    private final ImageService imageService;
    private final DisplaySettingsService displaySettingsService;
    private final ResultsService resultsService;
    private final PriceWobbleService priceWobbleService;
    private final TeamBalanceService teamBalanceService;

    /** What a reset did, for the confirmation message. */
    public record Result(int deletedAdverts, long deletedPlays) {
    }

    @Transactional
    public Result resetEvent() {
        int deleted = imageService.deleteAllAdverts();
        long plays = resultsService.deleteAllPlays();
        priceWobbleService.stop();
        teamBalanceService.deleteAll(); // balances and payments (#48), after the End of Day report is printed
        displaySettingsService.resetToDefaults();
        return new Result(deleted, plays);
    }
}
