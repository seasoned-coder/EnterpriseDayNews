package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;

import java.time.LocalDateTime;

/** API representation of an image. Decouples REST contract from JPA entity. */
public record ImageView(
        Long id,
        String filePath,
        String originalFileName,
        String uploadedBy,
        LocalDateTime uploadedAt,
        ApprovalStatus status,
        String vettedBy,
        LocalDateTime vettedAt,
        boolean display,
        int displayOrder
) {
    public static ImageView from(ImageMetadata m) {
        return new ImageView(
                m.getId(),
                m.getFilePath(),
                m.getOriginalFileName(),
                m.getUploadedBy(),
                m.getUploadedAt(),
                m.getStatus(),
                m.getVettedBy(),
                m.getVettedAt(),
                m.isDisplay(),
                m.getDisplayOrder()
        );
    }
}
