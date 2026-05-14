package org.example.enterprisedaynews.controller;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.dto.ImageView;
import org.example.enterprisedaynews.service.ImageService;
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

    @PostMapping("/upload")
    public ResponseEntity<ImageView> upload(@RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "priority", defaultValue = "1") int priority,
                                            @RequestParam(value = "durationSeconds", defaultValue = "10") int durationSeconds,
                                            Principal principal) throws IOException {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(ImageView.from(imageService.uploadImage(file, username, priority, durationSeconds)));
    }

    @GetMapping("/uploads")
    public ResponseEntity<List<ImageView>> getMyUploads(Principal principal) {
        String username = ControllerSupport.usernameOf(principal);
        return ResponseEntity.ok(imageService.getUserUploads(username).stream().map(ImageView::from).toList());
    }

    @DeleteMapping("/uploads/{id}")
    public ResponseEntity<Void> deleteMyUpload(@PathVariable Long id, Principal principal) {
        String username = ControllerSupport.usernameOf(principal);
        imageService.deleteStudentImage(id, username);
        return ResponseEntity.noContent().build();
    }
}

