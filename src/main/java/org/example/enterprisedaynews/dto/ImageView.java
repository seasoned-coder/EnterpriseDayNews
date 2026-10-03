package org.example.enterprisedaynews.dto;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;

import java.time.OffsetDateTime;

import static org.example.enterprisedaynews.dto.ApiTimes.withServerOffset;

/** API representation of an image. Decouples REST contract from JPA entity. */
public record ImageView(
        Long id,
        String filePath,
        /** URL to load the image from; signed when the image isn't public. Null for text-only messages. */
        String imageUrl,
        String originalFileName,
        String uploadedBy,
        OffsetDateTime uploadedAt,
        ApprovalStatus status,
        String vettedBy,
        OffsetDateTime vettedAt,
        boolean display,
        /** Whether it goes on screen as soon as it's approved, or waits for the student to publish it. */
        boolean publishOnApproval,
        int displayOrder,
        int priority,
        int durationSeconds,
        int totalCost,
        boolean isInfoMessage,
        boolean isFlashMode,
        String messageText
) {
    public static ImageView from(ImageMetadata m, String imageUrl) {
        return new ImageView(
                m.getId(),
                m.getFilePath(),
                imageUrl,
                m.getOriginalFileName(),
                m.getUploadedBy(),
                withServerOffset(m.getUploadedAt()),
                m.getStatus(),
                m.getVettedBy(),
                withServerOffset(m.getVettedAt()),
                m.isDisplay(),
                m.isPublishOnApproval(),
                m.getDisplayOrder(),
                m.getPriority(),
                m.getDurationSeconds(),
                m.getTotalCost(),
                m.isInfoMessage(),
                m.isFlashMode(),
                m.getMessageText()
        );
    }
}
