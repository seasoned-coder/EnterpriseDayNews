package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.service.ImageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final ImageService imageService;

    @GetMapping("/new")
    public List<ImageView> getNewImages() {
        return imageService.getNewImages().stream().map(ImageView::from).toList();
    }

    @GetMapping("/approved")
    public List<ImageView> getApprovedImages() {
        return imageService.getApprovedImages().stream().map(ImageView::from).toList();
    }

    @GetMapping("/rejected")
    public List<ImageView> getRejectedImages() {
        return imageService.getRejectedImages().stream().map(ImageView::from).toList();
    }

    @PostMapping("/approve/{id}")
    public ResponseEntity<ImageView> approve(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(ImageView.from(
                imageService.updateStatus(id, ApprovalStatus.APPROVED, ControllerSupport.usernameOf(principal))));
    }

    @PostMapping("/reject/{id}")
    public ResponseEntity<ImageView> reject(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(ImageView.from(
                imageService.updateStatus(id, ApprovalStatus.REJECTED, ControllerSupport.usernameOf(principal))));
    }

    @PostMapping("/toggle-display/{id}")
    public ResponseEntity<ImageView> toggleDisplay(@PathVariable Long id, @RequestParam boolean display) {
        return ResponseEntity.ok(ImageView.from(imageService.toggleDisplay(id, display)));
    }

    @PostMapping("/order")
    public ResponseEntity<Void> updateOrder(@RequestBody List<Long> ids) {
        imageService.updateDisplayOrder(ids);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/upload")
    public ResponseEntity<ImageView> staffUpload(@RequestParam("file") MultipartFile file,
                                                 Principal principal) throws IOException {
        String username = ControllerSupport.usernameOf(principal);
        ImageMetadata metadata = imageService.uploadImage(file, username);
        // Staff uploads are auto-approved.
        return ResponseEntity.ok(ImageView.from(
                imageService.updateStatus(metadata.getId(), ApprovalStatus.APPROVED, username)));
    }
}
