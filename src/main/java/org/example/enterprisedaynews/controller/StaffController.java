package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    @Autowired
    private ImageService imageService;

    @GetMapping("/new")
    public List<ImageMetadata> getNewImages() {
        return imageService.getNewImages();
    }

    @GetMapping("/approved")
    public List<ImageMetadata> getApprovedImages() {
        return imageService.getApprovedImages();
    }

    @GetMapping("/rejected")
    public List<ImageMetadata> getRejectedImages() {
        return imageService.getRejectedImages();
    }

    @PostMapping("/approve/{id}")
    public ResponseEntity<ImageMetadata> approve(@PathVariable Long id, Principal principal) {
        String username = (principal != null) ? principal.getName() : "anonymous_staff";
        return ResponseEntity.ok(imageService.updateStatus(id, ImageMetadata.ApprovalStatus.APPROVEd, username));
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<ImageMetadata> reject(@PathVariable Long id, Principal principal) {
        String username = (principal != null) ? principal.getName() : "anonymous_staff";
        return ResponseEntity.ok(imageService.updateStatus(id, ImageMetadata.ApprovalStatus.REJECTed, username));
    }

    @PostMapping("/toggle-display/{id}")
    public ResponseEntity<ImageMetadata> toggleDisplay(@PathVariable Long id, @RequestParam boolean display) {
        return ResponseEntity.ok(imageService.toggleDisplay(id, display));
    }

    @PostMapping("/order")
    public ResponseEntity<Void> updateOrder(@RequestBody List<Long> ids) {
        imageService.updateDisplayOrder(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/upload")
    public ResponseEntity<ImageMetadata> staffUpload(@RequestParam("file") MultipartFile file, Principal principal) throws IOException {
        String username = (principal != null) ? principal.getName() : "anonymous_staff";
        ImageMetadata metadata = imageService.uploadImage(file, username);
        // Automatically approve staff uploads
        return ResponseEntity.ok(imageService.updateStatus(metadata.getId(), ImageMetadata.ApprovalStatus.APPROVEd, username));
    }
}
