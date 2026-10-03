package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * At startup, queues a small preview (issue #42) for any upload that doesn't have one yet, e.g. pictures
 * uploaded before previews existed. They're made in the background; the server is usable straight away.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ThumbnailBackfill {

    private final ImageRepository imageRepository;
    private final ThumbnailService thumbnailService;

    @EventListener(ApplicationReadyEvent.class)
    public int queueMissing() {
        int queued = 0;
        for (ImageMetadata image : imageRepository.findAll()) {
            String file = image.getFilePath();
            if (file != null && !file.isBlank() && !thumbnailService.hasThumbnail(file)) {
                thumbnailService.createLater(file);
                queued++;
            }
        }
        if (queued > 0) {
            log.info("Making previews for {} earlier upload(s) in the background", queued);
        }
        return queued;
    }
}
