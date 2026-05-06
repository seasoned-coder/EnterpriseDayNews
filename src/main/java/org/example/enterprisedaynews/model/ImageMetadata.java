package org.example.enterprisedaynews.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImageMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filePath;
    private String originalFileName;
    private String uploadedBy;
    private LocalDateTime uploadedAt;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    private String vettedBy;
    private LocalDateTime vettedAt;

    private boolean display;
    private int displayOrder;

    private int priority;           // 1-4, configurable cost
    private int durationSeconds;    // 10, 20, or 30 seconds
    private int totalCost;          // cost = priorityCost + durationCost

    private boolean isInfoMessage;
    private boolean isFlashMode;
    private String messageText;
    private String externalUrl;
    private String screenshotPath;
    private LocalDateTime lastScreenshotAt;

    public enum ApprovalStatus {
        NEW, APPROVED, REJECTED
    }
}
