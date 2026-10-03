package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.dto.PlayReport;
import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.ResultsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projector")
@RequiredArgsConstructor
public class ProjectorController {

    private final ImageService imageService;

    private final ImageViews imageViews;
    private final DisplaySettingsService settingsService;
    private final ResultsService resultsService;

    @GetMapping("/images")
    public List<ImageView> getDisplayImages() {
        return imageViews.of(imageService.getDisplayImages());
    }

    @GetMapping("/settings")
    public DisplaySettings getSettings() {
        return settingsService.get();
    }

    @PostMapping("/settings")
    public ResponseEntity<DisplaySettings> updateSettings(@RequestBody DisplaySettings settings) {
        return ResponseEntity.ok(settingsService.update(settings));
    }

    /**
     * The projector reporting which adverts it showed and for how long (issue #40). Needs the projector key
     * (SecurityConfig), which staff give it by opening the projector from the staff app.
     */
    @PostMapping("/plays")
    public Map<String, Integer> recordPlays(@RequestBody List<PlayReport> reports) {
        return Map.of("recorded", resultsService.recordPlays(reports));
    }
}
