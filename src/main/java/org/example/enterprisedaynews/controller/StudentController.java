package org.example.enterprisedaynews.controller;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;

@RestController
@RequestMapping("/api/student")
public class StudentController {

    @Autowired
    private ImageService imageService;

    @PostMapping("/upload")
    public ResponseEntity<ImageMetadata> upload(@RequestParam("file") MultipartFile file, Principal principal) throws IOException {
        String username = (principal != null) ? principal.getName() : "anonymous_student";
        return ResponseEntity.ok(imageService.uploadImage(file, username));
    }
}
