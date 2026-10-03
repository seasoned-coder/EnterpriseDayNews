package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.dto.RejectRequest;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.service.EventResetService;
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
    private final ImageViews imageViews;
    private final EventResetService eventResetService;

    @GetMapping("/new")
    public List<ImageView> getNewImages() {
        return imageViews.of(imageService.getNewImages());
    }

    @GetMapping("/approved")
    public List<ImageView> getApprovedImages() {
        return imageViews.of(imageService.getApprovedImages());
    }

    @GetMapping("/rejected")
    public List<ImageView> getRejectedImages() {
        return imageViews.of(imageService.getRejectedImages());
    }

    @PostMapping("/approve/{id}")
    public ResponseEntity<ImageView> approve(@PathVariable Long id, Principal principal) {
        return ResponseEntity.ok(imageViews.of(
                imageService.updateStatus(id, ApprovalStatus.APPROVED, ControllerSupport.usernameOf(principal))));
    }

    /** Rejects an advert, optionally saying why ({@code {"reason": "..."}}), which the student sees (issue #38). */
    @PostMapping("/reject/{id}")
    public ResponseEntity<ImageView> reject(@PathVariable Long id,
                                            @RequestBody(required = false) RejectRequest request,
                                            Principal principal) {
        String reason = request == null ? null : request.reason();
        return ResponseEntity.ok(imageViews.of(imageService.updateStatus(
                id, ApprovalStatus.REJECTED, ControllerSupport.usernameOf(principal), reason)));
    }

    @PostMapping("/toggle-display/{id}")
    public ResponseEntity<ImageView> toggleDisplay(@PathVariable Long id, @RequestParam boolean display) {
        return ResponseEntity.ok(imageViews.of(imageService.toggleDisplay(id, display)));
    }

    @PostMapping("/order")
    public ResponseEntity<Void> updateOrder(@RequestBody List<Long> ids) {
        imageService.updateDisplayOrder(ids);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        imageService.deleteImage(id);
        return ResponseEntity.noContent().build();
    }

    /** End of Day: delete all student adverts and reset projector settings (issue #34). */
    @PostMapping("/reset-event")
    public EventResetService.Result resetEvent() {
        return eventResetService.resetEvent();
    }

    @GetMapping("/info")
    public List<ImageView> getInfoMessages() {
        return imageViews.of(imageService.getInfoMessages());
    }

    @PostMapping("/info/upload")
    public ResponseEntity<ImageView> uploadInfoMessage(@RequestParam("file") MultipartFile file,
                                                       @RequestParam(value = "flash", defaultValue = "false") boolean flash,
                                                       Principal principal) throws IOException {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(imageViews.of(imageService.uploadInfoMessage(file, username, flash)));
    }

    @PostMapping("/info/free-text")
    public ResponseEntity<ImageView> postFreeText(@RequestBody String text,
                                                  @RequestParam(value = "flash", defaultValue = "true") boolean flash,
                                                  Principal principal) {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(imageViews.of(imageService.postFreeTextMessage(text, username, flash)));
    }

    @PostMapping("/toggle-flash/{id}")
    public ResponseEntity<ImageView> toggleFlash(@PathVariable Long id, @RequestParam boolean flash) {
        return ResponseEntity.ok(imageViews.of(imageService.toggleFlashMode(id, flash)));
    }

}
