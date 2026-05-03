package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.service.ImageService;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
class EnterpriseDayNewsApplicationTests {

    @Mock
    private ImageRepository imageRepository;

    @InjectMocks
    private ImageService imageService;

    @Test
    void testUpdateStatusApprove() {
        ImageMetadata metadata = new ImageMetadata();
        metadata.setId(1L);
        metadata.setStatus(ImageMetadata.ApprovalStatus.NEW);

        when(imageRepository.findById(1L)).thenReturn(Optional.of(metadata));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata updated = imageService.updateStatus(1L, ImageMetadata.ApprovalStatus.APPROVEd, "staff1");

        assertEquals(ImageMetadata.ApprovalStatus.APPROVEd, updated.getStatus());
        assertTrue(updated.isDisplay());
        assertEquals("staff1", updated.getVettedBy());
    }

    @Test
    void testUpdateStatusReject() {
        ImageMetadata metadata = new ImageMetadata();
        metadata.setId(1L);
        metadata.setStatus(ImageMetadata.ApprovalStatus.NEW);

        when(imageRepository.findById(1L)).thenReturn(Optional.of(metadata));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata updated = imageService.updateStatus(1L, ImageMetadata.ApprovalStatus.REJECTed, "staff1");

        assertEquals(ImageMetadata.ApprovalStatus.REJECTed, updated.getStatus());
        assertFalse(updated.isDisplay());
    }
}
