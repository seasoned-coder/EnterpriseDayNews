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
    public ImageMetadata uploadImage(MultipartFile file, String username) throws IOException {
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
                .build();

        return imageRepository.save(metadata);
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
        return imageRepository.findByStatus(ApprovalStatus.NEW);
    }

    public List<ImageMetadata> getApprovedImages() {
        return imageRepository.findByStatus(ApprovalStatus.APPROVED);
    }

    public List<ImageMetadata> getRejectedImages() {
        return imageRepository.findByStatus(ApprovalStatus.REJECTED);
    }

    public List<ImageMetadata> getDisplayImages() {
        return imageRepository.findByStatusAndDisplayOrderByDisplayOrderAsc(ApprovalStatus.APPROVED, true);
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

    private ImageMetadata findOrThrow(Long id) {
        return imageRepository.findById(id).orElseThrow(() -> new ImageNotFoundException(id));
    }
}
