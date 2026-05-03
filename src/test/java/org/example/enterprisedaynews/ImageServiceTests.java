package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.service.ImageNotFoundException;
import org.example.enterprisedaynews.service.ImageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImageServiceTests {

    @Mock
    private ImageRepository imageRepository;

    @InjectMocks
    private ImageService imageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(imageService, "uploadDir", tempDir.toAbsolutePath().toString());
    }

    @Test
    void testUploadImage() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.png", "image/png", "some-image-data".getBytes());

        when(imageRepository.save(any(ImageMetadata.class))).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata result = imageService.uploadImage(file, "testuser");

        assertNotNull(result);
        assertEquals("testuser", result.getUploadedBy());
        assertEquals("test.png", result.getOriginalFileName());
        assertEquals(ApprovalStatus.NEW, result.getStatus());
        assertFalse(result.isDisplay());

        try (var stream = Files.list(tempDir)) {
            var list = stream.toList();
            assertFalse(list.isEmpty(), "Uploads directory should not be empty");
            Path savedFile = list.get(0);
            assertTrue(savedFile.getFileName().toString().contains("test.png"));
            assertEquals("some-image-data", Files.readString(savedFile));
        }
    }

    @Test
    void testUploadEmptyFileRejected() {
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", new byte[0]);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.uploadImage(file, "u"));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void testUploadUnsupportedTypeRejected() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "x.exe", "application/octet-stream", "data".getBytes());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.uploadImage(file, "u"));
        assertEquals(415, ex.getStatusCode().value());
    }

    @Test
    void testUpdateStatusApprove() {
        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setStatus(ApprovalStatus.NEW);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata updated = imageService.updateStatus(1L, ApprovalStatus.APPROVED, "staff1");

        assertEquals(ApprovalStatus.APPROVED, updated.getStatus());
        assertTrue(updated.isDisplay());
        assertEquals("staff1", updated.getVettedBy());
        assertNotNull(updated.getVettedAt());
    }

    @Test
    void testUpdateStatusReject() {
        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setStatus(ApprovalStatus.NEW);
        m.setDisplay(true);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata updated = imageService.updateStatus(1L, ApprovalStatus.REJECTED, "staff1");

        assertEquals(ApprovalStatus.REJECTED, updated.getStatus());
        assertFalse(updated.isDisplay());
    }

    @Test
    void testUpdateStatusNotFound() {
        when(imageRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ImageNotFoundException.class,
                () -> imageService.updateStatus(999L, ApprovalStatus.APPROVED, "staff"));
    }

    @Test
    void testToggleDisplayApproved() {
        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setStatus(ApprovalStatus.APPROVED);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata updated = imageService.toggleDisplay(1L, true);
        assertTrue(updated.isDisplay());

        updated = imageService.toggleDisplay(1L, false);
        assertFalse(updated.isDisplay());
    }

    @Test
    void testToggleDisplayOnNonApprovedRejected() {
        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setStatus(ApprovalStatus.NEW);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.toggleDisplay(1L, true));
        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void testToggleDisplayNotFound() {
        when(imageRepository.findById(999L)).thenReturn(Optional.empty());
        assertThrows(ImageNotFoundException.class, () -> imageService.toggleDisplay(999L, true));
    }

    @Test
    void testUpdateDisplayOrder() {
        ImageMetadata a = new ImageMetadata(); a.setId(10L);
        ImageMetadata b = new ImageMetadata(); b.setId(20L);
        when(imageRepository.findAllById(List.of(20L, 10L))).thenReturn(List.of(a, b));

        imageService.updateDisplayOrder(List.of(20L, 10L));

        assertEquals(0, b.getDisplayOrder());
        assertEquals(1, a.getDisplayOrder());
        verify(imageRepository).saveAll(any());
    }

    @Test
    void testUpdateDisplayOrderEmptyIsNoop() {
        imageService.updateDisplayOrder(List.of());
        verify(imageRepository, never()).findAllById(any());
        verify(imageRepository, never()).saveAll(any());
    }

    @Test
    void testUpdateDisplayOrderMissingIds() {
        when(imageRepository.findAllById(List.of(1L, 2L))).thenReturn(List.of(new ImageMetadata()));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.updateDisplayOrder(List.of(1L, 2L)));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void testGetDisplayImagesQueriesRepo() {
        imageService.getDisplayImages();
        verify(imageRepository)
                .findByStatusAndDisplayOrderByDisplayOrderAsc(ApprovalStatus.APPROVED, true);
    }

    @Test
    void testGetByStatusQueries() {
        imageService.getNewImages();
        imageService.getApprovedImages();
        imageService.getRejectedImages();
        verify(imageRepository).findByStatus(ApprovalStatus.NEW);
        verify(imageRepository).findByStatus(ApprovalStatus.APPROVED);
        verify(imageRepository).findByStatus(ApprovalStatus.REJECTED);
    }
}
