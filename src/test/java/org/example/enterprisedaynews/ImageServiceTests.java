package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.service.ImageNotFoundException;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.UploadFileNames;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.http.HttpStatus.FORBIDDEN;

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
    void testUploadNameCannotEscapeTheUploadsFolder() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
                "file", "../../../etc/evil name?.png", "image/png", "data".getBytes());
        when(imageRepository.save(any(ImageMetadata.class))).thenAnswer(i -> i.getArguments()[0]);

        ImageMetadata result = imageService.uploadImage(file, "year10");

        assertEquals("evil name?.png", result.getOriginalFileName(), "shown name keeps no folders");
        assertTrue(result.getFilePath().endsWith("_evil_name_.png"), result.getFilePath());
        try (var stream = Files.list(tempDir)) {
            List<Path> stored = stream.toList();
            assertEquals(1, stored.size(), "file was written inside the uploads folder");
            assertEquals(result.getFilePath(), stored.get(0).getFileName().toString());
        }
    }

    @Test
    void testUploadNamesAreTidiedForDisplayAndStorage() {
        assertEquals("photo.jpg", UploadFileNames.displayName("C:\\Users\\kid\\Pictures\\photo.jpg"));
        assertEquals("image", UploadFileNames.displayName(null));
        assertEquals("image", UploadFileNames.displayName("folder/"));
        assertEquals(120, UploadFileNames.displayName("x".repeat(300) + ".jpg").length());

        assertEquals("my_advert__1_.jpg", UploadFileNames.storageName("my advert (1).jpg"));
        assertEquals("htaccess", UploadFileNames.storageName(".htaccess"));
        assertEquals("image", UploadFileNames.storageName("..."));
    }

    @Test
    void testUploadUsesThePriceListAndRefusesOffListChoices() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", "data".getBytes());
        when(imageRepository.save(any(ImageMetadata.class))).thenAnswer(i -> i.getArguments()[0]);

        assertEquals(20 + 15, imageService.uploadImage(file, "year10", 4, 30, true).getTotalCost());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.uploadImage(file, "year10", 1, 300, true));
        assertEquals(400, ex.getStatusCode().value());
        try (var stream = Files.list(tempDir)) {
            assertEquals(1, stream.count(), "nothing is written for a refused upload");
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
        assertNull(updated.getRejectionReason());
    }

    /** Issue #38: the reason is kept (tidied) when rejecting, and cleared if staff later approve it. */
    @Test
    void rejectionReasonIsKeptUntilApproved() {
        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setStatus(ApprovalStatus.NEW);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        imageService.updateStatus(1L, ApprovalStatus.REJECTED, "staff1", "  Image too blurry  ");
        assertEquals("Image too blurry", m.getRejectionReason());

        imageService.updateStatus(1L, ApprovalStatus.APPROVED, "staff1", "ignored when approving");
        assertNull(m.getRejectionReason());
    }

    @Test
    void blankRejectionReasonIsNoReason() {
        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setStatus(ApprovalStatus.NEW);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));
        when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        imageService.updateStatus(1L, ApprovalStatus.REJECTED, "staff1", "   ");

        assertNull(m.getRejectionReason());
    }

    @Test
    void tooLongRejectionReasonIsRefusedBeforeAnythingChanges() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.updateStatus(1L, ApprovalStatus.REJECTED, "staff1", "x".repeat(201)));

        assertEquals(400, ex.getStatusCode().value());
        verify(imageRepository, never()).save(any());
    }

    private ImageMetadata studentAdvert(long id, ApprovalStatus status, boolean display, boolean publishOnApproval) {
        ImageMetadata m = ImageMetadata.builder()
                .id(id)
                .uploadedBy("year10")
                .status(status)
                .display(display)
                .publishOnApproval(publishOnApproval)
                .build();
        lenient().when(imageRepository.findById(id)).thenReturn(Optional.of(m));
        lenient().when(imageRepository.save(any())).thenAnswer(i -> i.getArguments()[0]);
        return m;
    }

    @Test
    void testUploadRemembersWhetherToPublishOnApproval() throws IOException {
        MockMultipartFile file = new MockMultipartFile("file", "a.png", "image/png", "data".getBytes());
        when(imageRepository.save(any(ImageMetadata.class))).thenAnswer(i -> i.getArguments()[0]);

        assertFalse(imageService.uploadImage(file, "year10", 2, 20, false).isPublishOnApproval());
        assertTrue(imageService.uploadImage(file, "year10", 2, 20, true).isPublishOnApproval());
    }

    @Test
    void testApprovingAWaitingAdvertKeepsItOffScreen() {
        studentAdvert(5L, ApprovalStatus.NEW, false, false);

        ImageMetadata approved = imageService.updateStatus(5L, ApprovalStatus.APPROVED, "staff1");

        assertEquals(ApprovalStatus.APPROVED, approved.getStatus());
        assertFalse(approved.isDisplay(), "student chose to publish it themselves");
    }

    @Test
    void testStudentPublishesAndWithdrawsAnApprovedAdvert() {
        studentAdvert(6L, ApprovalStatus.APPROVED, false, false);

        assertTrue(imageService.setPublishedByStudent(6L, "year10", true).isDisplay());
        assertFalse(imageService.setPublishedByStudent(6L, "year10", false).isDisplay());
    }

    @Test
    void testStudentChangesTheirMindBeforeApproval() {
        studentAdvert(7L, ApprovalStatus.NEW, false, true);

        ImageMetadata waiting = imageService.setPublishedByStudent(7L, "year10", false);

        assertFalse(waiting.isPublishOnApproval());
        assertFalse(waiting.isDisplay(), "still nothing on screen before approval");
    }

    @Test
    void testRejectedAdvertCannotBePublished() {
        studentAdvert(8L, ApprovalStatus.REJECTED, false, true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.setPublishedByStudent(8L, "year10", true));
        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void testStudentsCanOnlyPublishTheirOwnAdverts() {
        studentAdvert(9L, ApprovalStatus.APPROVED, false, false);
        ImageMetadata staffInfo = studentAdvert(10L, ApprovalStatus.APPROVED, false, true);
        staffInfo.setInfoMessage(true);

        assertEquals(FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> imageService.setPublishedByStudent(9L, "another-team", true)).getStatusCode());
        assertEquals(FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> imageService.setPublishedByStudent(10L, "year10", true)).getStatusCode());
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
    void testGetDisplayImagesFlashOverridesDisplay() {
        ImageMetadata m2 = new ImageMetadata();
        m2.setId(2L);
        m2.setStatus(ApprovalStatus.APPROVED);
        m2.setDisplay(false); // Display is FALSE
        m2.setFlashMode(true); // but FLASH is TRUE

        when(imageRepository.findByIsFlashModeTrue()).thenReturn(List.of(m2));

        List<ImageMetadata> result = imageService.getDisplayImages();

        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getId());
        // Issue #36: the projector's poll never loads the whole table, and skips the normal list during a flash.
        verify(imageRepository, never()).findAll();
        verify(imageRepository, never()).findByStatusAndDisplayOrderByDisplayOrderAsc(any(), anyBoolean());
    }

    @Test
    void testGetDisplayImagesMultipleFlash() {
        ImageMetadata m1 = new ImageMetadata();
        m1.setId(1L);
        m1.setFlashMode(true);

        ImageMetadata m2 = new ImageMetadata();
        m2.setId(2L);
        m2.setFlashMode(true);

        when(imageRepository.findByIsFlashModeTrue()).thenReturn(List.of(m1, m2));

        List<ImageMetadata> result = imageService.getDisplayImages();

        assertEquals(2, result.size());
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
        verify(imageRepository).findByStatusOrderByUploadedAtDesc(ApprovalStatus.NEW);
        verify(imageRepository).findByStatusOrderByDisplayOrderAsc(ApprovalStatus.APPROVED);
        verify(imageRepository).findByStatusOrderByUploadedAtDesc(ApprovalStatus.REJECTED);
    }

    @Test
    void testDeleteImage() throws IOException {
        String fileName = "to-delete.png";
        Path filePath = tempDir.resolve(fileName);
        Files.writeString(filePath, "content");

        ImageMetadata m = new ImageMetadata();
        m.setId(1L);
        m.setFilePath(fileName);

        when(imageRepository.findById(1L)).thenReturn(Optional.of(m));

        imageService.deleteImage(1L);

        assertFalse(Files.exists(filePath));
        verify(imageRepository).delete(m);
    }

    @Test
    void testDeleteStudentImageOwned() throws IOException {
        String fileName = "owned-delete.png";
        Path filePath = tempDir.resolve(fileName);
        Files.writeString(filePath, "content");

        ImageMetadata m = new ImageMetadata();
        m.setId(7L);
        m.setFilePath(fileName);
        m.setUploadedBy("student1");

        when(imageRepository.findById(7L)).thenReturn(Optional.of(m));

        imageService.deleteStudentImage(7L, "student1");

        assertFalse(Files.exists(filePath));
        verify(imageRepository).delete(m);
    }

    @Test
    void testDeleteStudentImageDifferentOwnerForbidden() {
        ImageMetadata m = new ImageMetadata();
        m.setId(8L);
        m.setUploadedBy("student2");

        when(imageRepository.findById(8L)).thenReturn(Optional.of(m));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService.deleteStudentImage(8L, "student1"));
        assertEquals(FORBIDDEN, ex.getStatusCode());
        verify(imageRepository, never()).delete(any());
    }

    @Test
    void testDeleteAllAdvertsProtectsInfoMessages() throws IOException {
        String f1 = "student.png";
        String f2 = "staff-info.png";
        Files.writeString(tempDir.resolve(f1), "c1");
        Files.writeString(tempDir.resolve(f2), "c2");

        ImageMetadata m1 = new ImageMetadata(); 
        m1.setId(1L);
        m1.setFilePath(f1);
        m1.setInfoMessage(false);

        ImageMetadata m2 = new ImageMetadata(); 
        m2.setId(2L);
        m2.setFilePath(f2);
        m2.setInfoMessage(true);

        // Only student adverts are fetched (ImageQueryTests checks the query really leaves staff items out).
        when(imageRepository.findByIsInfoMessageOrderByUploadedAtDesc(false)).thenReturn(List.of(m1));

        assertEquals(1, imageService.deleteAllAdverts(), "one student advert deleted");

        assertFalse(Files.exists(tempDir.resolve(f1)), "Student image should be deleted from disk");
        assertTrue(Files.exists(tempDir.resolve(f2)), "Staff info image should NOT be deleted from disk");
        
        verify(imageRepository).delete(m1);
        verify(imageRepository, never()).delete(m2);
    }

    @Test
    void testPostFreeTextUpdatesExisting() {
        ImageMetadata existing = new ImageMetadata();
        existing.setId(100L);
        existing.setFlashMode(false);
        existing.setMessageText("Old Flash");
        existing.setInfoMessage(true);

        when(imageRepository.findByIsInfoMessageAndMessageTextIsNotNull(true)).thenReturn(List.of(existing));
        when(imageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ImageMetadata result = imageService.postFreeTextMessage("New Flash", "staff", true);

        assertEquals(100L, result.getId());
        assertEquals("New Flash", result.getMessageText());
        assertTrue(result.isFlashMode());
        verify(imageRepository, never()).delete(any());
        verify(imageRepository).save(existing);
    }

    @Test
    void testDeleteTextMessageNoNPE() {
        ImageMetadata textMsg = new ImageMetadata();
        textMsg.setId(16L);
        textMsg.setMessageText("Important Announcement");
        textMsg.setFilePath(null);
        textMsg.setInfoMessage(true);

        when(imageRepository.findById(16L)).thenReturn(Optional.of(textMsg));

        // This should not throw NullPointerException
        assertDoesNotThrow(() -> imageService.deleteImage(16L));
        
        verify(imageRepository).delete(textMsg);
    }
}
