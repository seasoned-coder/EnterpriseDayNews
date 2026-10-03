package org.example.enterprisedaynews;

import org.example.enterprisedaynews.live.LiveTopic;
import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.repository.DisplaySettingsRepository;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DisplaySettingsServiceTests {

    private final DisplaySettingsRepository repository = mock(DisplaySettingsRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final DisplaySettingsService service = new DisplaySettingsService(repository, events);

    /** Issue #43: the projector is told straight away. */
    @Test
    void savingTellsOpenPagesTheSettingsChanged() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.update(settings(60, 10, 3));

        verify(events).publishEvent(new LiveTopic.Changed(LiveTopic.PROJECTOR_SETTINGS));
    }

    private static DisplaySettings settings(int interval, int staffItem, int refresh) {
        return DisplaySettings.builder()
                .id("ignored")
                .intervalSpeedSeconds(interval)
                .displayDurationSeconds(staffItem)
                .imageRefreshSeconds(refresh)
                .build();
    }

    @Test
    void savesValidSettingsAsTheSingletonRow() {
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        DisplaySettings saved = service.update(settings(0, 15, 5));

        assertEquals(DisplaySettings.DEFAULT_ID, saved.getId());
        assertEquals(0, saved.getIntervalSpeedSeconds(), "0 = staff item after every advert");
        assertEquals(15, saved.getDisplayDurationSeconds());
        assertEquals(5, saved.getImageRefreshSeconds());
    }

    @Test
    void rejectsOutOfRangeValues() {
        for (DisplaySettings bad : new DisplaySettings[]{
                settings(-1, 10, 3), settings(3601, 10, 3),
                settings(60, 2, 3), settings(60, 121, 3),
                settings(60, 10, 1), settings(60, 10, 61)}) {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.update(bad));
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        }
        verify(repository, never()).save(any());
    }

    @Test
    void defaultsSlipStaffContentInEveryMinute() {
        DisplaySettings defaults = DisplaySettings.defaults();
        assertEquals(60, defaults.getIntervalSpeedSeconds());
        assertEquals(10, defaults.getDisplayDurationSeconds());
        assertEquals(3, defaults.getImageRefreshSeconds());
    }

    @Test
    void getFallsBackToDefaultsAndSeedingKeepsExistingRow() {
        when(repository.findById(DisplaySettings.DEFAULT_ID)).thenReturn(Optional.empty());
        assertEquals(60, service.get().getIntervalSpeedSeconds());

        DisplaySettings existing = settings(5, 10, 3);
        when(repository.findById(DisplaySettings.DEFAULT_ID)).thenReturn(Optional.of(existing));
        assertSame(existing, service.ensureSeeded());
        verify(repository, never()).save(any());
    }
}
