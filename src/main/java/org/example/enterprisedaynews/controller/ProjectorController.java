package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.model.DisplaySettings;
import org.example.enterprisedaynews.service.DisplaySettingsService;
import org.example.enterprisedaynews.service.ImageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/projector")
@RequiredArgsConstructor
public class ProjectorController {

    private final ImageService imageService;
    private final DisplaySettingsService settingsService;

    @GetMapping("/images")
    public List<ImageView> getDisplayImages() {
        return imageService.getDisplayImages().stream().map(ImageView::from).toList();
    }

    @GetMapping("/settings")
    public DisplaySettings getSettings() {
        return settingsService.get();
    }

    @PostMapping("/settings")
    public ResponseEntity<DisplaySettings> updateSettings(@RequestBody DisplaySettings settings) {
        return ResponseEntity.ok(settingsService.update(settings));
    }
}
