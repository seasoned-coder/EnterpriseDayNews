package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.service.ImageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Issue #36: the projector feed and event reset fetch only the rows they need with database queries
 * (instead of loading every image and filtering in Java), so these check against a real database that
 * the queries pick the right rows.
 */
@SpringBootTest
class ImageQueryTests {

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private ImageService imageService;

    private final List<ImageMetadata> created = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        imageRepository.deleteAll(created);
        created.clear();
    }

    private ImageMetadata stored(boolean display, boolean flash, boolean info) {
        ImageMetadata saved = imageRepository.save(ImageMetadata.builder()
                .uploadedBy(info ? "querystaff" : "queryco")
                .uploadedAt(LocalDateTime.now())
                .status(ApprovalStatus.APPROVED)
                .display(display)
                .isFlashMode(flash)
                .isInfoMessage(info)
                .messageText(info ? "info" : null)
                .priority(1)
                .durationSeconds(10)
                .build());
        created.add(saved);
        return saved;
    }

    @Test
    void projectorShowsOnlyFlashItemsWhileAnyFlashIsOn() {
        ImageMetadata live = stored(true, false, false);
        ImageMetadata flash = stored(false, true, true);

        assertThat(imageService.getDisplayImages()).extracting(ImageMetadata::getId)
                .contains(flash.getId()).doesNotContain(live.getId());
    }

    @Test
    void projectorShowsTheNormalListWhenNothingIsFlashing() {
        ImageMetadata live = stored(true, false, false);
        ImageMetadata hidden = stored(false, false, false);

        assertThat(imageService.getDisplayImages()).extracting(ImageMetadata::getId)
                .contains(live.getId()).doesNotContain(hidden.getId());
    }

    @Test
    void studentAdvertQueryLeavesStaffItemsOut() {
        ImageMetadata advert = stored(true, false, false);
        ImageMetadata staffItem = stored(true, false, true);

        List<Long> adverts = imageRepository.findByIsInfoMessageOrderByUploadedAtDesc(false).stream()
                .map(ImageMetadata::getId).toList();

        assertThat(adverts).contains(advert.getId()).doesNotContain(staffItem.getId());
    }
}
