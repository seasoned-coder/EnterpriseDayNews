package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.ImageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StudentControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImageService imageService;

    @Autowired
    private JwtProvider jwtProvider;

    private String studentToken;
    private String staffToken;

    @BeforeEach
    void setUp() {
        studentToken = "Bearer " + jwtProvider.generateToken("student1", Roles.STUDENT);
        staffToken = "Bearer " + jwtProvider.generateToken("staff1", Roles.STAFF);
    }

    @Test
    void testStudentUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", "content".getBytes());
        ImageMetadata metadata = new ImageMetadata();
        metadata.setId(1L);
        metadata.setUploadedBy("student1");

        when(imageService.uploadImage(any(), eq("student1"), anyInt(), anyInt())).thenReturn(metadata);

        mockMvc.perform(multipart("/api/student/upload")
                .file(file)
                .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploadedBy").value("student1"));
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
}
