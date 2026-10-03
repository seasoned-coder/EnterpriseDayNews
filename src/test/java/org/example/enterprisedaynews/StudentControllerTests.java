package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.repository.StudentAccountRepository;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StudentControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImageService imageService;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private StudentAccountService studentAccountService;

    @Autowired
    private StudentAccountRepository studentAccountRepository;

    /** Student tokens are only honoured for an existing, unlocked account. */
    private static final String STUDENT_USERNAME = "uploadco";

    private String studentToken;
    private String staffToken;

    @BeforeEach
    void setUp() {
        if (!studentAccountRepository.existsByUsername(STUDENT_USERNAME)) {
            studentAccountService.createAccount(STUDENT_USERNAME, "Upload42");
        }
        studentToken = "Bearer " + jwtProvider.generateToken(STUDENT_USERNAME, Roles.STUDENT);
        staffToken = TestAccounts.staffBearer(context, "staff1");
    }

    @Test
    void testStudentUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "content".getBytes());
        ImageMetadata metadata = new ImageMetadata();
        metadata.setId(1L);
        metadata.setUploadedBy(STUDENT_USERNAME);

        when(imageService.uploadImage(any(), eq(STUDENT_USERNAME), anyInt(), anyInt(), eq(true))).thenReturn(metadata);

        mockMvc.perform(multipart("/api/student/upload")
                .file(file)
                .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadedBy").value(STUDENT_USERNAME));
    }

    @Test
    void testUploadCanWaitForTheStudentToPublish() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", "content".getBytes());
        ImageMetadata metadata = new ImageMetadata();
        metadata.setId(2L);
        metadata.setUploadedBy(STUDENT_USERNAME);
        metadata.setPublishOnApproval(false);
        when(imageService.uploadImage(any(), eq(STUDENT_USERNAME), anyInt(), anyInt(), eq(false))).thenReturn(metadata);

        mockMvc.perform(multipart("/api/student/upload")
                .file(file)
                .param("publishOnApproval", "false")
                .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.publishOnApproval").value(false));
    }

    @Test
    void testPublishAndWithdrawOwnAdvert() throws Exception {
        ImageMetadata published = new ImageMetadata();
        published.setId(42L);
        published.setDisplay(true);
        when(imageService.setPublishedByStudent(42L, STUDENT_USERNAME, true)).thenReturn(published);

        mockMvc.perform(post("/api/student/uploads/42/publish")
                .param("published", "true")
                .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.display").value(true));

        mockMvc.perform(post("/api/student/uploads/42/publish")
                .param("published", "true")
                .header("Authorization", staffToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetMyUploads() throws Exception {
        when(imageService.getUserUploads(STUDENT_USERNAME)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/student/uploads")
                .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void testDeleteMyUpload() throws Exception {
        mockMvc.perform(delete("/api/student/uploads/42")
                .header("Authorization", studentToken))
                .andExpect(status().isNoContent());

        verify(imageService).deleteStudentImage(42L, STUDENT_USERNAME);
    }

    @Test
    void testStudentUploadUnauthorized() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "content".getBytes());

        mockMvc.perform(multipart("/api/student/upload").file(file))
                .andExpect(status().isForbidden());
    }

    @Test
    void testStudentUploadWrongRole() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "content".getBytes());

        mockMvc.perform(multipart("/api/student/upload")
                .file(file)
                .header("Authorization", staffToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testDeleteMyUploadWrongRole() throws Exception {
        mockMvc.perform(delete("/api/student/uploads/42")
                .header("Authorization", staffToken))
                .andExpect(status().isForbidden());
    }
}
