package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.repository.DisplaySettingsRepository;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.example.enterprisedaynews.service.EventResetService;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.PriceWobbleService;
import org.example.enterprisedaynews.service.ResultsService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Issue #34: resetting the event removes all adverts and restores the default projector settings. */
class EventResetServiceTests {

    private final ImageService imageService = mock(ImageService.class);
    private final ResultsService resultsService = mock(ResultsService.class);
    private final PriceWobbleService priceWobbleService = mock(PriceWobbleService.class);
    private final DisplaySettingsRepository settingsRepository = mock(DisplaySettingsRepository.class);
    private final EventResetService eventResetService =
            new EventResetService(imageService, new DisplaySettingsService(settingsRepository), resultsService,
                    priceWobbleService);

    @Test
    void deletesAllAdvertsAndScreenTimeAndRestoresDefaultSettings() {
        when(imageService.deleteAllAdverts()).thenReturn(7);
        when(resultsService.deleteAllPlays()).thenReturn(120L);
        when(settingsRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EventResetService.Result result = eventResetService.resetEvent();

        assertEquals(7, result.deletedAdverts());
        assertEquals(120L, result.deletedPlays()); // issue #40
        verify(imageService).deleteAllAdverts();
        verify(priceWobbleService).stop(); // back to normal prices (issue #41)
        ArgumentCaptor<DisplaySettings> saved = ArgumentCaptor.forClass(DisplaySettings.class);
        verify(settingsRepository).save(saved.capture());
        assertEquals(DisplaySettings.DEFAULT_ID, saved.getValue().getId());
        assertEquals(DisplaySettings.DEFAULT_INTERVAL_SECONDS, saved.getValue().getIntervalSpeedSeconds());
        assertEquals(DisplaySettings.DEFAULT_DURATION_SECONDS, saved.getValue().getDisplayDurationSeconds());
        assertEquals(DisplaySettings.DEFAULT_REFRESH_SECONDS, saved.getValue().getImageRefreshSeconds());
    }
}
