package org.example.enterprisedaynews.service;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ImageService {

    private final String uploadDir = "src/main/resources/static/uploads/";

    @Autowired
    private ImageRepository imageRepository;

    public ImageMetadata uploadImage(MultipartFile file, String username) throws IOException {
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = Paths.get(uploadDir + fileName);
        Files.copy(file.getInputStream(), filePath);

        ImageMetadata metadata = ImageMetadata.builder()
                .filePath("/uploads/" + fileName)
                .originalFileName(file.getOriginalFilename())
                .uploadedBy(username)
                .uploadedAt(LocalDateTime.now())
                .status(ImageMetadata.ApprovalStatus.NEW)
                .display(false)
                .build();

        return imageRepository.save(metadata);
    }

    public List<ImageMetadata> getNewImages() {
        return imageRepository.findByStatus(ImageMetadata.ApprovalStatus.NEW);
    }

    public List<ImageMetadata> getApprovedImages() {
        return imageRepository.findByStatus(ImageMetadata.ApprovalStatus.APPROVEd);
    }

    public List<ImageMetadata> getRejectedImages() {
        return imageRepository.findByStatus(ImageMetadata.ApprovalStatus.REJECTed);
    }

    public List<ImageMetadata> getDisplayImages() {
        return imageRepository.findByStatusAndDisplayOrderByDisplayOrderAsc(ImageMetadata.ApprovalStatus.APPROVEd, true);
    }

    public ImageMetadata updateStatus(Long id, ImageMetadata.ApprovalStatus status, String vettedBy) {
        ImageMetadata metadata = imageRepository.findById(id).orElseThrow();
        metadata.setStatus(status);
        metadata.setVettedBy(vettedBy);
        metadata.setVettedAt(LocalDateTime.now());
        if (status == ImageMetadata.ApprovalStatus.APPROVEd) {
            metadata.setDisplay(true);
        } else if (status == ImageMetadata.ApprovalStatus.REJECTed) {
            metadata.setDisplay(false);
        }
        return imageRepository.save(metadata);
    }

    public ImageMetadata toggleDisplay(Long id, boolean display) {
        ImageMetadata metadata = imageRepository.findById(id).orElseThrow();
        metadata.setDisplay(display);
        return imageRepository.save(metadata);
    }

    public void updateDisplayOrder(List<Long> ids) {
        for (int i = 0; i < ids.size(); i++) {
            ImageMetadata metadata = imageRepository.findById(ids.get(i)).orElseThrow();
            metadata.setDisplayOrder(i);
            imageRepository.save(metadata);
        }
    }
}
