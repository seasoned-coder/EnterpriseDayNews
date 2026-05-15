package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.model.StudentAccount;
import org.example.enterprisedaynews.security.JwtProvider;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.ImageService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class StaffControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ImageService imageService;

    @MockitoBean
    private StudentAccountService studentAccountService;

    @Autowired
    private JwtProvider jwtProvider;

    private String staffToken;
    private String studentToken;

    @BeforeEach
    void setUp() {
        staffToken = "Bearer " + jwtProvider.generateToken("staff1", Roles.STAFF);
        studentToken = "Bearer " + jwtProvider.generateToken("student", Roles.STUDENT);
    }

    private static ImageMetadata sampleImage(Long id, ApprovalStatus status) {
        ImageMetadata m = new ImageMetadata();
        m.setId(id);
        m.setStatus(status);
        return m;
    }

    private static StudentAccount sampleStudentAccount(Long id, String username, boolean locked) {
        StudentAccount account = new StudentAccount();
        account.setId(id);
        account.setUsername(username);
        account.setLocked(locked);
        return account;
    }

    @Test
    void testGetNewImages() throws Exception {
        when(imageService.getNewImages()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/staff/new")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void testApproveImage() throws Exception {
        when(imageService.updateStatus(eq(1L), eq(ApprovalStatus.APPROVED), eq("staff1")))
                .thenReturn(sampleImage(1L, ApprovalStatus.APPROVED));

        mockMvc.perform(post("/api/staff/approve/1")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void testRejectImage() throws Exception {
        when(imageService.updateStatus(eq(1L), eq(ApprovalStatus.REJECTED), eq("staff1")))
                .thenReturn(sampleImage(1L, ApprovalStatus.REJECTED));

        mockMvc.perform(post("/api/staff/reject/1")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void testToggleDisplay() throws Exception {
        ImageMetadata m = sampleImage(1L, ApprovalStatus.APPROVED);
        m.setDisplay(true);
        when(imageService.toggleDisplay(eq(1L), eq(true))).thenReturn(m);

        mockMvc.perform(post("/api/staff/toggle-display/1")
                .param("display", "true")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.display").value(true));
    }

    @Test
    void testUpdateOrder() throws Exception {
        mockMvc.perform(post("/api/staff/order")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[1, 2, 3]")
                .header("Authorization", staffToken))
                .andExpect(status().isOk());
    }

    @Test
    void testStaffUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "staff.jpg", "image/jpeg", "content".getBytes());
        ImageMetadata m = sampleImage(10L, ApprovalStatus.NEW);

        when(imageService.uploadImage(any(), eq("staff1"))).thenReturn(m);
        when(imageService.updateStatus(eq(10L), eq(ApprovalStatus.APPROVED), eq("staff1")))
                .thenReturn(sampleImage(10L, ApprovalStatus.APPROVED));

        mockMvc.perform(multipart("/api/staff/upload")
                .file(file)
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void testGetApprovedImages() throws Exception {
        when(imageService.getApprovedImages()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/staff/approved")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void testGetRejectedImages() throws Exception {
        when(imageService.getRejectedImages()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/staff/rejected")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void testDeleteImage() throws Exception {
        mockMvc.perform(delete("/api/staff/1")
                .header("Authorization", staffToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void testDeleteAllImages() throws Exception {
        mockMvc.perform(delete("/api/staff/all")
                .header("Authorization", staffToken))
                .andExpect(status().isNoContent());
    }

    @Test
    void testStaffEndpointsForbiddenForStudents() throws Exception {
        mockMvc.perform(get("/api/staff/new")
                .header("Authorization", studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetInfoMessages() throws Exception {
        when(imageService.getInfoMessages()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/staff/info")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void testUploadInfoMessage() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "info.jpg", "image/jpeg", "content".getBytes());
        ImageMetadata m = sampleImage(20L, ApprovalStatus.APPROVED);
        m.setInfoMessage(true);

        when(imageService.uploadInfoMessage(any(), eq("staff1"), eq(true))).thenReturn(m);

        mockMvc.perform(multipart("/api/staff/info/upload")
                .file(file)
                .param("flash", "true")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isInfoMessage").value(true));
    }

    @Test
    void testPostFreeText() throws Exception {
        ImageMetadata m = sampleImage(30L, ApprovalStatus.APPROVED);
        m.setInfoMessage(true);
        m.setMessageText("Urgent News");
        m.setFlashMode(true);

        when(imageService.postFreeTextMessage(eq("Urgent News"), eq("staff1"), eq(true))).thenReturn(m);

        mockMvc.perform(post("/api/staff/info/free-text")
                .param("flash", "true")
                .contentType(MediaType.TEXT_PLAIN)
                .content("Urgent News")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messageText").value("Urgent News"))
                .andExpect(jsonPath("$.isFlashMode").value(true));
    }

    @Test
    void testToggleFlash() throws Exception {
        ImageMetadata m = sampleImage(1L, ApprovalStatus.APPROVED);
        m.setFlashMode(true);
        when(imageService.toggleFlashMode(eq(1L), eq(true))).thenReturn(m);

        mockMvc.perform(post("/api/staff/toggle-flash/1")
                .param("flash", "true")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isFlashMode").value(true));
    }

    @Test
    void testGetStudentAccounts() throws Exception {
        when(studentAccountService.listAccounts()).thenReturn(List.of(sampleStudentAccount(1L, "student", false)));

        mockMvc.perform(get("/api/staff/students")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("student"))
                .andExpect(jsonPath("$[0].locked").value(false));
    }

    @Test
    void testCreateStudentAccount() throws Exception {
        when(studentAccountService.createAccount(eq("student2"), eq("pass123")))
                .thenReturn(sampleStudentAccount(2L, "student2", false));

        mockMvc.perform(post("/api/staff/students")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"student2\",\"password\":\"pass123\"}")
                .header("Authorization", staffToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("student2"));
    }

    @Test
    void testLockStudentAccount() throws Exception {
        when(studentAccountService.setLocked(eq(4L), eq(true)))
                .thenReturn(sampleStudentAccount(4L, "guest", true));

        mockMvc.perform(post("/api/staff/students/4/lock")
                .param("locked", "true")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.locked").value(true));
    }

    @Test
    void testUpdateStudentPassword() throws Exception {
        when(studentAccountService.changePassword(eq(4L), eq("newpass")))
                .thenReturn(sampleStudentAccount(4L, "guest", false));

        mockMvc.perform(put("/api/staff/students/4/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"newpass\"}")
                .header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("guest"));
    }

    @Test
    void testDeleteStudentAccount() throws Exception {
        mockMvc.perform(delete("/api/staff/students/4")
                .header("Authorization", staffToken))
                .andExpect(status().isNoContent());

        verify(studentAccountService).deleteAccount(4L);
    }
}
