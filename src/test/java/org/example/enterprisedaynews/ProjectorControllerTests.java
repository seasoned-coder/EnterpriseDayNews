package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.example.enterprisedaynews.service.ImageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProjectorControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DisplaySettingsService settingsService;

    @MockitoBean
    private ImageService imageService;

    @Test
    void testGetSettingsDefault() throws Exception {
        when(settingsService.get()).thenReturn(DisplaySettings.defaults());

        mockMvc.perform(get("/api/projector/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(DisplaySettings.DEFAULT_ID))
                .andExpect(jsonPath("$.intervalSpeedSeconds").value(DisplaySettings.DEFAULT_INTERVAL_SECONDS))
                .andExpect(jsonPath("$.displayDurationSeconds").value(DisplaySettings.DEFAULT_DURATION_SECONDS))
                .andExpect(jsonPath("$.imageRefreshSeconds").value(DisplaySettings.DEFAULT_REFRESH_SECONDS));
    }

    @Test
    void testGetSettingsExisting() throws Exception {
        DisplaySettings settings = DisplaySettings.builder()
                .id(DisplaySettings.DEFAULT_ID)
                .intervalSpeedSeconds(15)
                .displayDurationSeconds(30)
                .imageRefreshSeconds(120)
                .build();
        when(settingsService.get()).thenReturn(settings);

        mockMvc.perform(get("/api/projector/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intervalSpeedSeconds").value(15))
                .andExpect(jsonPath("$.displayDurationSeconds").value(30))
                .andExpect(jsonPath("$.imageRefreshSeconds").value(120));
    }

    @Test
    void testUpdateSettings() throws Exception {
        DisplaySettings saved = DisplaySettings.builder()
                .id(DisplaySettings.DEFAULT_ID)
                .intervalSpeedSeconds(20)
                .displayDurationSeconds(40)
                .imageRefreshSeconds(90)
                .build();
        when(settingsService.update(any())).thenReturn(saved);

        String json = "{\"intervalSpeedSeconds\":20,\"displayDurationSeconds\":40,\"imageRefreshSeconds\":90}";

        mockMvc.perform(post("/api/projector/settings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intervalSpeedSeconds").value(20))
                .andExpect(jsonPath("$.displayDurationSeconds").value(40))
                .andExpect(jsonPath("$.imageRefreshSeconds").value(90));
    }

    @Test
    void testGetImagesEmpty() throws Exception {
        when(imageService.getDisplayImages()).thenReturn(java.util.List.of());

        mockMvc.perform(get("/api/projector/images"))
                .andExpect(status().isOk());
    }
}
