package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.DisplaySettingsRepository;
import org.example.enterprisedaynews.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projector")
public class ProjectorController {

    @Autowired
    private ImageService imageService;

    @Autowired
    private DisplaySettingsRepository displaySettingsRepository;

    @GetMapping("/images")
    public List<ImageMetadata> getDisplayImages() {
        return imageService.getDisplayImages();
    }

    @GetMapping("/settings")
    public DisplaySettings getSettings() {
        return displaySettingsRepository.findById("DEFAULT")
                .orElse(DisplaySettings.builder()
                        .id("DEFAULT")
                        .intervalSpeedSeconds(5)
                        .displayDurationSeconds(10)
                        .build());
    }

    @PostMapping("/settings")
    public ResponseEntity<DisplaySettings> updateSettings(@RequestBody DisplaySettings settings) {
        settings.setId("DEFAULT");
        return ResponseEntity.ok(displaySettingsRepository.save(settings));
    }
}
