package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.CreateStudentAccountRequest;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.dto.StudentAccountView;
import org.example.enterprisedaynews.dto.UpdateStudentPasswordRequest;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.StudentAccountService;
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
    private final StudentAccountService studentAccountService;

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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        imageService.deleteImage(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<Void> deleteAll() {
        imageService.deleteAllImages();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/info")
    public List<ImageView> getInfoMessages() {
        return imageService.getInfoMessages().stream().map(ImageView::from).toList();
    }

    @PostMapping("/info/upload")
    public ResponseEntity<ImageView> uploadInfoMessage(@RequestParam("file") MultipartFile file,
                                                       @RequestParam(value = "flash", defaultValue = "false") boolean flash,
                                                       Principal principal) throws IOException {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(ImageView.from(imageService.uploadInfoMessage(file, username, flash)));
    }

    @PostMapping("/info/free-text")
    public ResponseEntity<ImageView> postFreeText(@RequestBody String text,
                                                  @RequestParam(value = "flash", defaultValue = "true") boolean flash,
                                                  Principal principal) {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(ImageView.from(imageService.postFreeTextMessage(text, username, flash)));
    }

    @PostMapping("/toggle-flash/{id}")
    public ResponseEntity<ImageView> toggleFlash(@PathVariable Long id, @RequestParam boolean flash) {
        return ResponseEntity.ok(ImageView.from(imageService.toggleFlashMode(id, flash)));
    }

    @GetMapping("/students")
    public List<StudentAccountView> getStudentAccounts() {
        return studentAccountService.listAccounts().stream().map(StudentAccountView::from).toList();
    }

    @PostMapping("/students")
    public ResponseEntity<StudentAccountView> createStudentAccount(@RequestBody CreateStudentAccountRequest request) {
        return ResponseEntity.status(201).body(StudentAccountView.from(
                studentAccountService.createAccount(request.username(), request.password())));
    }

    @PostMapping("/students/{id}/lock")
    public ResponseEntity<StudentAccountView> setStudentLock(@PathVariable Long id, @RequestParam boolean locked) {
        return ResponseEntity.ok(StudentAccountView.from(studentAccountService.setLocked(id, locked)));
    }

    @PutMapping("/students/{id}/password")
    public ResponseEntity<StudentAccountView> updateStudentPassword(@PathVariable Long id,
                                                                    @RequestBody UpdateStudentPasswordRequest request) {
        return ResponseEntity.ok(StudentAccountView.from(
                studentAccountService.changePassword(id, request.password())));
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<Void> deleteStudentAccount(@PathVariable Long id) {
        studentAccountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }
}
