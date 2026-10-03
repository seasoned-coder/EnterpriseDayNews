package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.PriceList;
import org.example.enterprisedaynews.service.PriceWobbleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {

    private final ImageService imageService;

    private final ImageViews imageViews;

    private final PriceWobbleService priceWobbleService;

    @PostMapping("/upload")
    public ResponseEntity<ImageView> upload(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "priority", defaultValue = "1") int priority,
                                            @RequestParam(value = "durationSeconds", defaultValue = "10") int durationSeconds,
                                            @RequestParam(value = "publishOnApproval", defaultValue = "true") boolean publishOnApproval,
                                            Principal principal) throws IOException {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(imageViews.of(
                imageService.uploadImage(file, username, priority, durationSeconds, publishOnApproval)));
    }

    /** The priority and duration choices and what each costs now (issue #35), with any price wobble (#41). */
    @GetMapping("/prices")
    public PriceList.Prices prices() {
        return priceWobbleService.studentPrices();
    }

    /** Publish (put on screen) or withdraw one of your own adverts; see ImageService#setPublishedByStudent. */
    @PostMapping("/uploads/{id}/publish")
    public ImageView setPublished(@PathVariable Long id, @RequestParam boolean published, Principal principal) {
        return imageViews.of(imageService.setPublishedByStudent(id, ControllerSupport.usernameOf(principal), published));
    }

    @GetMapping("/uploads")
    public ResponseEntity<List<ImageView>> getMyUploads(Principal principal) {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(imageViews.of(imageService.getUserUploads(username)));
    }

    @DeleteMapping("/uploads/{id}")
    public ResponseEntity<Void> deleteMyUpload(@PathVariable Long id, Principal principal) {
        String username = ControllerSupport.usernameOf(principal);
        imageService.deleteStudentImage(id, username);
        return ResponseEntity.noContent().build();
    }
}

