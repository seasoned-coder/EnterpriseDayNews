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
        /** A small preview for cards and lists (issue #42), same access rules; null until it has been made. */
        String thumbnailUrl,
        String originalFileName,
        String uploadedBy,
        OffsetDateTime uploadedAt,
        ApprovalStatus status,
        String vettedBy,
        OffsetDateTime vettedAt,
        /** Why it was rejected (issue #38), or null. */
        String rejectionReason,
        boolean display,
        /** Whether it goes on screen as soon as it's approved, or waits for the student to publish it. */
        boolean publishOnApproval,
        int displayOrder,
        int priority,
        int durationSeconds,
        /** What the team was charged, at the prices when it was uploaded (locked in; issue #47). */
        int totalCost,
        /** Those prices as a percentage of normal (a price wobble); 100 = normal. */
        int pricePercent,
        boolean isInfoMessage,
        boolean isFlashMode,
        String messageText
) {
    public static ImageView from(ImageMetadata m, String imageUrl, String thumbnailUrl) {
        return new ImageView(
                m.getId(),
                m.getFilePath(),
                imageUrl,
                thumbnailUrl,
                m.getOriginalFileName(),
                m.getUploadedBy(),
                withServerOffset(m.getUploadedAt()),
                m.getStatus(),
                m.getVettedBy(),
                withServerOffset(m.getVettedAt()),
                m.getRejectionReason(),
                m.isDisplay(),
                m.isPublishOnApproval(),
                m.getDisplayOrder(),
                m.getPriority(),
                m.getDurationSeconds(),
                m.getTotalCost(),
                m.getPricePercent(),
                m.isInfoMessage(),
                m.isFlashMode(),
                m.getMessageText()
        );
    }
}
