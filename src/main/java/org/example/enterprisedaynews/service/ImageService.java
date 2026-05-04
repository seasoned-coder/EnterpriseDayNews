package org.example.enterprisedaynews.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Transactional
    public ImageMetadata uploadImage(MultipartFile file, String username, int priority, int durationSeconds) throws IOException {
        validateFile(file);

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image";
        String fileName = UUID.randomUUID() + "_" + originalName;

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        Path filePath = uploadPath.resolve(fileName);
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
                .priority(priority)
                .durationSeconds(durationSeconds)
                .totalCost(calculateCost(priority, durationSeconds))
                .build();

        return imageRepository.save(metadata);
    }

    /**
     * Legacy method for backward compatibility (no priority/duration).
     */
    @Transactional
    public ImageMetadata uploadImage(MultipartFile file, String username) throws IOException {
        return uploadImage(file, username, 1, 10);
    }

    private int calculateCost(int priority, int durationSeconds) {
        // Costs: priority 1=5, 2=10, 3=15, 4=20
        int priorityCost = priority * 5;
        // Costs: 10s=5, 20s=10, 30s=15
        int durationCost = (durationSeconds / 10) * 5;
        return priorityCost + durationCost;
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
        List<ImageMetadata> activeFlashes = imageRepository.findAll().stream()
                .filter(ImageMetadata::isFlashMode)
                .toList();
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
        ImageMetadata metadata = uploadImage(file, username, 4, 10);
        metadata.setInfoMessage(true);
        metadata.setFlashMode(flashMode);
        metadata.setStatus(ApprovalStatus.APPROVED);
        metadata.setVettedBy(username);
        metadata.setVettedAt(LocalDateTime.now());
        metadata.setDisplay(false); // Default should be HIDE
        return imageRepository.save(metadata);
    }

    @Transactional
    public ImageMetadata postFreeTextMessage(String text, String username, boolean flashMode) {
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
        return imageRepository.save(metadata);
    }

    @Transactional
    public ImageMetadata toggleFlashMode(Long id, boolean flashMode) {
        ImageMetadata metadata = findOrThrow(id);
        metadata.setFlashMode(flashMode);
        return imageRepository.save(metadata);
    }

    @Transactional
    public ImageMetadata updateStatus(Long id, ApprovalStatus status, String vettedBy) {
        ImageMetadata metadata = findOrThrow(id);
        // Enforce the approval state machine — see ImageStateMachine for allowed transitions.
        ImageStateMachine.assertCanTransition(metadata.getStatus(), status);
        metadata.setStatus(status);
        metadata.setVettedBy(vettedBy);
        metadata.setVettedAt(LocalDateTime.now());
        // Display flag is derived from status: APPROVED -> visible by default, REJECTED -> hidden.
        metadata.setDisplay(status == ApprovalStatus.APPROVED);
        return imageRepository.save(metadata);
    }

    @Transactional
    public ImageMetadata toggleDisplay(Long id, boolean display) {
        ImageMetadata metadata = findOrThrow(id);
        if (display && metadata.getStatus() != ApprovalStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only APPROVED images can be set to display");
        }
        metadata.setDisplay(display);
        return imageRepository.save(metadata);
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
    }

    @Transactional
    public void deleteImage(Long id) {
        ImageMetadata metadata = findOrThrow(id);
        deletePhysicalFile(metadata.getFilePath());
        imageRepository.delete(metadata);
    }

    @Transactional
    public void deleteAllImages() {
        List<ImageMetadata> all = imageRepository.findAll();
        for (ImageMetadata metadata : all) {
            deletePhysicalFile(metadata.getFilePath());
        }
        imageRepository.deleteAll();
    }

    private void deletePhysicalFile(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.error("Failed to delete physical file: {}", fileName, e);
        }
    }

    private ImageMetadata findOrThrow(Long id) {
        return imageRepository.findById(id).orElseThrow(() -> new ImageNotFoundException(id));
    }
}
