package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.security.UploadUrlSigner;
import org.springframework.stereotype.Component;

import java.util.List;

/** Maps images to API views, attaching a (signed if needed) URL the caller is allowed to load. */
@Component
@RequiredArgsConstructor
class ImageViews {

    private final UploadUrlSigner uploadUrlSigner;

    ImageView of(ImageMetadata image) {
        return ImageView.from(image, uploadUrlSigner.urlFor(image));
    }

    List<ImageView> of(List<ImageMetadata> images) {
        return images.stream().map(this::of).toList();
    }
}
