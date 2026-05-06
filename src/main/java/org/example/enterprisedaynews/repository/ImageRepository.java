package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImageRepository extends JpaRepository<ImageMetadata, Long> {
    List<ImageMetadata> findByStatusOrderByDisplayOrderAsc(ImageMetadata.ApprovalStatus status);
    List<ImageMetadata> findByStatusOrderByUploadedAtDesc(ImageMetadata.ApprovalStatus status);
    List<ImageMetadata> findByStatusAndDisplayOrderByDisplayOrderAsc(ImageMetadata.ApprovalStatus status, boolean display);
    List<ImageMetadata> findByUploadedByOrderByUploadedAtDesc(String uploadedBy);
    List<ImageMetadata> findByIsInfoMessageOrderByUploadedAtDesc(boolean isInfoMessage);
    List<ImageMetadata> findByIsInfoMessageAndMessageTextIsNotNull(boolean isInfoMessage);
    List<ImageMetadata> findByIsInfoMessageAndExternalUrlIsNotNull(boolean isInfoMessage);
}
