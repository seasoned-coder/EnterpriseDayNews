package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.live.LiveTopic;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImageService {

    /** Allowed mime types for uploaded images. */
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"
    );

    private final ImageRepository imageRepository;
    private final PriceWobbleService priceWobbleService;
    private final ThumbnailService thumbnailService;
    private final TeamBalanceService teamBalanceService;
    private final ApplicationEventPublisher events;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    /**
     * Stores a student's upload as NEW (awaiting review).
     *
     * @param publishOnApproval true = goes on screen as soon as staff approve it; false = waits after
     *                          approval until the student publishes it (issue #9)
     */
    @Transactional
    public ImageMetadata uploadImage(MultipartFile file, String username, int priority, int durationSeconds,
                                     boolean publishOnApproval) throws IOException {
        validateFile(file);
        // Checked before anything is written: only choices on the price list are accepted. The price, including
        // any price wobble in force now (#41), is locked in here.
        int pricePercent = priceWobbleService.currentPercent();
        int totalCost = PriceList.totalCost(priority, durationSeconds, pricePercent);

        // The name comes from the user's browser: never let it choose where the file goes.
        String originalName = UploadFileNames.displayName(file.getOriginalFilename());
        String fileName = UUID.randomUUID() + "_" + UploadFileNames.storageName(originalName);

        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        Path filePath = uploadPath.resolve(fileName).normalize();
        if (!filePath.startsWith(uploadPath)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name");
        }
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, filePath, StandardCopyOption.REPLACE_EXISTING);
        }

        ImageMetadata metadata = ImageMetadata.builder()
                .filePath(fileName)
                .originalFileName(originalName)
                .uploadedBy(username)
                .uploadedAt(LocalDateTime.now())
                .status(ApprovalStatus.NEW)
                .display(false)
                .publishOnApproval(publishOnApproval)
                .priority(priority)
                .durationSeconds(durationSeconds)
                .totalCost(totalCost)
                .pricePercent(pricePercent)
                .build();

        ImageMetadata saved = changed(imageRepository.save(metadata));
        thumbnailService.createLater(fileName); // small preview for cards and lists (issue #42)
        return saved;
    }

    /**
     * Legacy method for backward compatibility (no priority/duration).
     */
    @Transactional
    public ImageMetadata uploadImage(MultipartFile file, String username) throws IOException {
        return uploadImage(file, username, 1, 10, true);
    }

    public List<ImageMetadata> getUserUploads(String username) {
        return imageRepository.findByUploadedByOrderByUploadedAtDesc(username);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Unsupported content type: " + contentType);
        }
    }

    public List<ImageMetadata> getNewImages() {
        return imageRepository.findByStatusOrderByUploadedAtDesc(ApprovalStatus.NEW);
    }

    public List<ImageMetadata> getApprovedImages() {
        return imageRepository.findByStatusOrderByDisplayOrderAsc(ApprovalStatus.APPROVED);
    }

    public List<ImageMetadata> getRejectedImages() {
        return imageRepository.findByStatusOrderByUploadedAtDesc(ApprovalStatus.REJECTED);
    }

    public List<ImageMetadata> getDisplayImages() {
        // The projector asks every few seconds: only fetch the rows it needs, never the whole table.
        List<ImageMetadata> activeFlashes = imageRepository.findByIsFlashModeTrue();
        if (!activeFlashes.isEmpty()) {
            return activeFlashes;
        }
        return imageRepository.findByStatusAndDisplayOrderByDisplayOrderAsc(ApprovalStatus.APPROVED, true);
    }

    public List<ImageMetadata> getInfoMessages() {
        return imageRepository.findByIsInfoMessageOrderByUploadedAtDesc(true);
    }

    @Transactional
    public ImageMetadata uploadInfoMessage(MultipartFile file, String username, boolean flashMode) throws IOException {
        ImageMetadata metadata = uploadImage(file, username, 4, 10, true);
        metadata.setInfoMessage(true);
        metadata.setFlashMode(flashMode);
        metadata.setStatus(ApprovalStatus.APPROVED);
        metadata.setVettedBy(username);
        metadata.setVettedAt(LocalDateTime.now());
        metadata.setDisplay(false); // Default should be HIDE
        return changed(imageRepository.save(metadata));
    }

    @Transactional
    public ImageMetadata postFreeTextMessage(String text, String username, boolean flashMode) {
        // Find existing text-based info messages
        List<ImageMetadata> existingMessages = imageRepository.findByIsInfoMessageAndMessageTextIsNotNull(true);
        
        // If we are posting a new text message, we want to REUSE/UPDATE the existing one if it's there
        // rather than creating multiples.
        if (!existingMessages.isEmpty()) {
            ImageMetadata metadata = existingMessages.get(0);
            metadata.setMessageText(text);
            metadata.setUploadedBy(username);
            metadata.setUploadedAt(LocalDateTime.now());
            metadata.setVettedBy(username);
            metadata.setVettedAt(LocalDateTime.now());
            metadata.setFlashMode(flashMode);
            metadata.setDisplay(true);
            return changed(imageRepository.save(metadata));
        }

        ImageMetadata metadata = ImageMetadata.builder()
                .messageText(text)
                .uploadedBy(username)
                .uploadedAt(LocalDateTime.now())
                .status(ApprovalStatus.APPROVED)
                .vettedBy(username)
                .vettedAt(LocalDateTime.now())
                .display(true) // Free text with FLASH MODE should probably be active immediately? 
                // "for really urgent messages we also need a 'free text box' , that also gets 'FLASH MODE' status and when active immediately takes over the projector."
                .isInfoMessage(true)
                .isFlashMode(flashMode)
                .priority(4)
                .durationSeconds(10)
                .build();
        return changed(imageRepository.save(metadata));
    }

    @Transactional
    public ImageMetadata toggleFlashMode(Long id, boolean flashMode) {
        ImageMetadata metadata = findOrThrow(id);
        metadata.setFlashMode(flashMode);
        return changed(imageRepository.save(metadata));
    }

    /** Longest rejection reason (issue #38): a sentence, shown on the student's phone. */
    public static final int MAX_REJECTION_REASON = 200;

    @Transactional
    public ImageMetadata updateStatus(Long id, ApprovalStatus status, String vettedBy) {
        return updateStatus(id, status, vettedBy, null);
    }

    /**
     * Approves or rejects an advert. When rejecting, {@code rejectionReason} (optional) tells the student why
     * (issue #38); approving clears any earlier reason.
     */
    @Transactional
    public ImageMetadata updateStatus(Long id, ApprovalStatus status, String vettedBy, String rejectionReason) {
        String reason = rejectionReason == null || rejectionReason.isBlank() ? null : rejectionReason.trim();
        if (reason != null && reason.length() > MAX_REJECTION_REASON) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Keep the reason under " + MAX_REJECTION_REASON + " characters");
        }
        ImageMetadata metadata = findOrThrow(id);
        // Enforce the approval state machine — see ImageStateMachine for allowed transitions.
        ImageStateMachine.assertCanTransition(metadata.getStatus(), status);
        // The team owes for it once approved, and gets it back if it's rejected after all (issue #48).
        teamBalanceService.onStatusChange(metadata, metadata.getStatus(), status, vettedBy);
        metadata.setStatus(status);
        metadata.setVettedBy(vettedBy);
        metadata.setVettedAt(LocalDateTime.now());
        metadata.setRejectionReason(status == ApprovalStatus.REJECTED ? reason : null);
        // Approving puts it on screen only if the student chose "as soon as it's approved"; rejecting hides it.
        metadata.setDisplay(status == ApprovalStatus.APPROVED && metadata.isPublishOnApproval());
        return changed(imageRepository.save(metadata));
    }

    /**
     * A student publishing or withdrawing their own advert (issue #9). Once approved this puts it on or
     * takes it off the screen straight away; while still awaiting review it changes whether it goes on
     * screen when approved. Rejected adverts can't be published.
     */
    @Transactional
    public ImageMetadata setPublishedByStudent(Long id, String username, boolean published) {
        ImageMetadata metadata = findOwnedByStudent(id, username, "publish");
        switch (metadata.getStatus()) {
            case APPROVED -> metadata.setDisplay(published);
            case NEW -> metadata.setPublishOnApproval(published);
            case REJECTED -> throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This advert wasn't approved, so it can't go on screen. Ask a member of staff why.");
        }
        return changed(imageRepository.save(metadata));
    }

    @Transactional
    public ImageMetadata toggleDisplay(Long id, boolean display) {
        ImageMetadata metadata = findOrThrow(id);
        if (display && metadata.getStatus() != ApprovalStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only APPROVED images can be set to display");
        }
        metadata.setDisplay(display);
        return changed(imageRepository.save(metadata));
    }

    @Transactional
    public void updateDisplayOrder(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        List<ImageMetadata> found = imageRepository.findAllById(ids);
        if (found.size() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "One or more images not found for ordering");
        }
        // Re-order according to the ids list, avoiding N+1 queries.
        for (int i = 0; i < ids.size(); i++) {
            Long id = ids.get(i);
            ImageMetadata m = found.stream()
                    .filter(x -> x.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new ImageNotFoundException(id));
            m.setDisplayOrder(i);
        }
        imageRepository.saveAll(found);
        changed();
    }

    @Transactional
    public void deleteImage(Long id) {
        ImageMetadata metadata = findOrThrow(id);
        deleteImage(metadata);
    }

    @Transactional
    public void deleteStudentImage(Long id, String username) {
        deleteImage(findOwnedByStudent(id, username, "delete"));
    }

    /** The image if it exists and was uploaded by this student (staff info items never belong to students). */
    private ImageMetadata findOwnedByStudent(Long id, String username, String action) {
        ImageMetadata metadata = findOrThrow(id);
        if (metadata.isInfoMessage() || !Objects.equals(metadata.getUploadedBy(), username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only " + action + " your own uploads");
        }
        return metadata;
    }

    private void deleteImage(ImageMetadata metadata) {
        deletePhysicalFile(metadata.getFilePath());
        imageRepository.delete(metadata);
        changed();
    }

    /**
     * Deletes every student advert and its file, keeping staff information items (Event Communications).
     *
     * @return how many adverts were deleted
     */
    @Transactional
    public int deleteAllAdverts() {
        int deleted = 0;
        for (ImageMetadata metadata : imageRepository.findByIsInfoMessageOrderByUploadedAtDesc(false)) {
            deleteImage(metadata);
            deleted++;
        }
        return deleted;
    }

    private void deletePhysicalFile(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return;
        }
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error("Failed to delete physical file: {}", fileName, e);
        }
        thumbnailService.delete(fileName);
    }

    /**
     * Tells open pages that adverts changed (issue #43); sent once the transaction commits. Returns the image
     * so it can wrap a save.
     */
    private ImageMetadata changed(ImageMetadata image) {
        changed();
        return image;
    }

    private void changed() {
        events.publishEvent(new LiveTopic.Changed(LiveTopic.ADVERTS));
    }

    private ImageMetadata findOrThrow(Long id) {
        return imageRepository.findById(id).orElseThrow(() -> new ImageNotFoundException(id));
    }
}
