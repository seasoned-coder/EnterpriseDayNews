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

    /** Why staff rejected it, shown to the student (issue #38). Cleared when it's approved. */
    @Column(length = 200)
    private String rejectionReason;

    private boolean display;
    private int displayOrder;

    /**
     * Student's choice at upload: go on screen as soon as staff approve it (true), or wait until the
     * student publishes it (false). See issue #9.
     */
    @Builder.Default
    @Column(nullable = false)
    private boolean publishOnApproval = true;

    private int priority;           // 1-4, configurable cost
    private int durationSeconds;    // 10, 20, or 30 seconds
    private int totalCost;          // cost = priorityCost + durationCost, at the prices when uploaded (locked in)

    /** Prices when it was uploaded, as a percentage of normal (a price wobble, #41/#47); 100 = normal. */
    @Builder.Default
    @Column(nullable = false)
    private int pricePercent = 100;

    private boolean isInfoMessage;
    private boolean isFlashMode;
    private String messageText;

    public enum ApprovalStatus {
        NEW, APPROVED, REJECTED
    }
}
