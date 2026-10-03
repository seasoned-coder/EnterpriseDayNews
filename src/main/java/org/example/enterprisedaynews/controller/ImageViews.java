package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.security.UploadUrlSigner;
import org.example.enterprisedaynews.service.ThumbnailService;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Maps images to API views, attaching (signed if needed) URLs the caller is allowed to load: the picture,
 * and its small preview once that has been made (issue #42).
 */
@Component
@RequiredArgsConstructor
class ImageViews {

    private final UploadUrlSigner uploadUrlSigner;
    private final ThumbnailService thumbnailService;

    ImageView of(ImageMetadata image) {
        String thumbnailUrl = thumbnailService.hasThumbnail(image.getFilePath())
                ? uploadUrlSigner.thumbnailUrlFor(image) : null;
        return ImageView.from(image, uploadUrlSigner.urlFor(image), thumbnailUrl);
    }

    List<ImageView> of(List<ImageMetadata> images) {
        return images.stream().map(this::of).toList();
    }
}
