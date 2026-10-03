package org.example.enterprisedaynews.repository;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ImageRepository extends JpaRepository<ImageMetadata, Long> {
    /** Keeps a renamed account's uploads (and staff items) attached to it. */
    @Modifying
    @Query("update ImageMetadata m set m.uploadedBy = :newName where m.uploadedBy = :oldName")
    int renameUploader(@Param("oldName") String oldName, @Param("newName") String newName);

    /** Keeps "approved by" on adverts pointing at a renamed staff member. */
    @Modifying
    @Query("update ImageMetadata m set m.vettedBy = :newName where m.vettedBy = :oldName")
    int renameVetter(@Param("oldName") String oldName, @Param("newName") String newName);

    Optional<ImageMetadata> findFirstByFilePath(String filePath);
    List<ImageMetadata> findByStatusOrderByDisplayOrderAsc(ImageMetadata.ApprovalStatus status);
    List<ImageMetadata> findByStatusOrderByUploadedAtDesc(ImageMetadata.ApprovalStatus status);
    List<ImageMetadata> findByStatusAndDisplayOrderByDisplayOrderAsc(ImageMetadata.ApprovalStatus status, boolean display);
    List<ImageMetadata> findByUploadedByOrderByUploadedAtDesc(String uploadedBy);
    List<ImageMetadata> findByIsInfoMessageOrderByUploadedAtDesc(boolean isInfoMessage);
    List<ImageMetadata> findByIsInfoMessageAndMessageTextIsNotNull(boolean isInfoMessage);
    List<ImageMetadata> findByIsFlashModeTrue();

    /** Each team's approved adverts and their cost: what they spent on screen time (issue #40). */
    @Query("select new org.example.enterprisedaynews.repository.TeamSpend(m.uploadedBy, count(m), sum(m.totalCost)) "
            + "from ImageMetadata m where m.isInfoMessage = false and m.status = :status group by m.uploadedBy")
    List<TeamSpend> spendByTeam(@Param("status") ImageMetadata.ApprovalStatus status);

    /** Every team that has uploaded an advert (issue #40). */
    @Query("select distinct m.uploadedBy from ImageMetadata m where m.isInfoMessage = false and m.uploadedBy is not null")
    List<String> studentUploaders();
}
