package org.example.enterprisedaynews.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "images")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filePath;
    private String originalFileName;
    private String uploadedBy; // Username or ID from auth
    private LocalDateTime uploadedAt;

    @Enumerated(EnumType.STRING)
    private ApprovalStatus status;

    private String vettedBy;
    private LocalDateTime vettedAt;

    private boolean display;
    private int displayOrder;

    public enum ApprovalStatus {
        NEW, APPROVEd, REJECTed
    }
}
