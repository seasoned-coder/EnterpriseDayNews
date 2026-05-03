package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.security.Roles;
import org.example.enterprisedaynews.service.ImageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

    private static ImageMetadata sampleImage(Long id, ApprovalStatus status) {
        ImageMetadata m = new ImageMetadata();
        m.setId(id);
        m.setStatus(status);
        return m;
    }

    @Test
    void testGetNewImages() throws Exception {
        when(imageService.getNewImages()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/staff/new")
                .header(Roles.HEADER_USER, "staff1")
                .header(Roles.HEADER_ROLE, Roles.STAFF))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    void testApproveImage() throws Exception {
        when(imageService.updateStatus(eq(1L), eq(ApprovalStatus.APPROVED), eq("staff1")))
                .thenReturn(sampleImage(1L, ApprovalStatus.APPROVED));

        mockMvc.perform(post("/api/staff/approve/1")
                .header(Roles.HEADER_USER, "staff1")
                .header(Roles.HEADER_ROLE, Roles.STAFF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void testRejectImage() throws Exception {
        when(imageService.updateStatus(eq(1L), eq(ApprovalStatus.REJECTED), eq("staff1")))
                .thenReturn(sampleImage(1L, ApprovalStatus.REJECTED));

        mockMvc.perform(post("/api/staff/reject/1")
                .header(Roles.HEADER_USER, "staff1")
                .header(Roles.HEADER_ROLE, Roles.STAFF))
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
                .header(Roles.HEADER_USER, "staff1")
                .header(Roles.HEADER_ROLE, Roles.STAFF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.display").value(true));
    }

    @Test
    void testUpdateOrder() throws Exception {
        mockMvc.perform(post("/api/staff/order")
                .contentType(MediaType.APPLICATION_JSON)
                .content("[1, 2, 3]")
                .header(Roles.HEADER_USER, "staff1")
                .header(Roles.HEADER_ROLE, Roles.STAFF))
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
                .header(Roles.HEADER_USER, "staff1")
                .header(Roles.HEADER_ROLE, Roles.STAFF))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void testStaffEndpointsForbiddenForStudents() throws Exception {
        mockMvc.perform(get("/api/staff/new")
                .header(Roles.HEADER_USER, "alice")
                .header(Roles.HEADER_ROLE, Roles.STUDENT))
                .andExpect(status().isForbidden());
    }
}
