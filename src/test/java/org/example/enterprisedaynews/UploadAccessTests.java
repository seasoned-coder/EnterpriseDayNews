package org.example.enterprisedaynews;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.example.enterprisedaynews.security.UploadUrlSigner;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Issue #31: only projector items are public under /uploads; everything else needs a signed link. */
@SpringBootTest
@AutoConfigureMockMvc
class UploadAccessTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private UploadUrlSigner uploadUrlSigner;

    @Autowired
    private ApplicationContext context;

    @Value("${app.upload-dir}")
    private String uploadDir;

    private final List<ImageMetadata> created = new ArrayList<>();

    @AfterEach
    void cleanUp() throws IOException {
        for (ImageMetadata m : created) {
            Files.deleteIfExists(Paths.get(uploadDir).resolve(m.getFilePath()));
            imageRepository.deleteById(m.getId());
        }
        created.clear();
    }

    private ImageMetadata storedImage(ApprovalStatus status, boolean display, boolean flash) throws IOException {
        String fileName = UUID.randomUUID() + "_test advert.jpg";
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Files.write(dir.resolve(fileName), new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00});
        ImageMetadata saved = imageRepository.save(ImageMetadata.builder()
                .filePath(fileName)
                .originalFileName("test advert.jpg")
                .uploadedBy("uploadco")
                .uploadedAt(LocalDateTime.now())
                .status(status)
                .display(display)
                .isFlashMode(flash)
                .priority(1)
                .durationSeconds(10)
                .build());
        created.add(saved);
        return saved;
    }

    @Test
    void projectorItemsArePublic() throws Exception {
        ImageMetadata live = storedImage(ApprovalStatus.APPROVED, true, false);

        mockMvc.perform(get(URI.create(uploadUrlSigner.urlFor(live))))
                .andExpect(status().isOk());
    }

    /** Issue #36: browsers keep their copy (only theirs) rather than downloading it again over the Wi-Fi. */
    @Test
    void imagesCanBeKeptByTheBrowser() throws Exception {
        ImageMetadata live = storedImage(ApprovalStatus.APPROVED, true, false);

        mockMvc.perform(get(URI.create(uploadUrlSigner.urlFor(live))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "max-age=3600, private"));
    }

    @Test
    void unapprovedUploadIsNotPublic() throws Exception {
        ImageMetadata pending = storedImage(ApprovalStatus.NEW, false, false);

        mockMvc.perform(get("/uploads/{file}", pending.getFilePath()))
                .andExpect(status().isNotFound());
    }

    @Test
    void hiddenAndRejectedUploadsAreNotPublic() throws Exception {
        ImageMetadata hidden = storedImage(ApprovalStatus.APPROVED, false, false);
        ImageMetadata rejected = storedImage(ApprovalStatus.REJECTED, false, false);

        mockMvc.perform(get("/uploads/{file}", hidden.getFilePath())).andExpect(status().isNotFound());
        mockMvc.perform(get("/uploads/{file}", rejected.getFilePath())).andExpect(status().isNotFound());
    }

    @Test
    void signedLinkGivesAccessToPrivateUpload() throws Exception {
        ImageMetadata pending = storedImage(ApprovalStatus.NEW, false, false);

        mockMvc.perform(get(URI.create(uploadUrlSigner.urlFor(pending))))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("private")));
    }

    @Test
    void forgedSignatureIsRejected() throws Exception {
        ImageMetadata pending = storedImage(ApprovalStatus.NEW, false, false);

        mockMvc.perform(get("/uploads/{file}", pending.getFilePath())
                        .param("exp", String.valueOf(System.currentTimeMillis() / 1000 + 3600))
                        .param("sig", "not-a-real-signature"))
                .andExpect(status().isNotFound());
    }

    @Test
    void filesWithoutARecordAreNotServed() throws Exception {
        String orphan = UUID.randomUUID() + "_orphan.jpg";
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        Files.write(dir.resolve(orphan), new byte[]{1, 2, 3});
        try {
            mockMvc.perform(get("/uploads/{file}", orphan)).andExpect(status().isNotFound());
        } finally {
            Files.deleteIfExists(dir.resolve(orphan));
        }
    }

    @Test
    void staffListingsCarrySignedLinksForPendingUploads() throws Exception {
        ImageMetadata pending = storedImage(ApprovalStatus.NEW, false, false);
        String staffToken = TestAccounts.staffBearer(context, "staff.member");

        mockMvc.perform(get("/api/staff/new").header("Authorization", staffToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + pending.getId() + ")].imageUrl")
                        .value(contains(matchesPattern("/uploads/.+\\?exp=\\d+&sig=[\\w-]+"))));
    }

    /** A preview made for this picture (issue #42), as ThumbnailService would. */
    private Path previewOf(ImageMetadata image) throws IOException {
        Path thumb = Paths.get(uploadDir).resolve("thumbs").resolve(image.getFilePath() + ".jpg");
        Files.createDirectories(thumb.getParent());
        Files.write(thumb, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01});
        thumb.toFile().deleteOnExit();
        return thumb;
    }

    @Test
    void previewsFollowTheirPicturesAccessRules() throws Exception {
        ImageMetadata live = storedImage(ApprovalStatus.APPROVED, true, false);
        ImageMetadata pending = storedImage(ApprovalStatus.NEW, false, false);
        Path livePreview = previewOf(live);
        Path pendingPreview = previewOf(pending);
        try {
            // Public picture: public preview.
            mockMvc.perform(get(URI.create(uploadUrlSigner.thumbnailUrlFor(live))))
                    .andExpect(status().isOk());
            assertThat(uploadUrlSigner.thumbnailUrlFor(live)).isEqualTo("/uploads/thumbs/" + live.getFilePath().replace(" ", "%20") + ".jpg");
            // Private picture: the preview needs the picture's signed link too.
            mockMvc.perform(get("/uploads/thumbs/{file}", pending.getFilePath() + ".jpg"))
                    .andExpect(status().isNotFound());
            mockMvc.perform(get(URI.create(uploadUrlSigner.thumbnailUrlFor(pending))))
                    .andExpect(status().isOk());
        } finally {
            Files.deleteIfExists(livePreview);
            Files.deleteIfExists(pendingPreview);
        }
    }

    @Test
    void listingsOfferThePreviewOnceItExists() throws Exception {
        ImageMetadata pending = storedImage(ApprovalStatus.NEW, false, false);
        String staffToken = TestAccounts.staffBearer(context, "staff.member");
        String path = "$[?(@.id == " + pending.getId() + ")].thumbnailUrl";

        mockMvc.perform(get("/api/staff/new").header("Authorization", staffToken))
                .andExpect(jsonPath(path).value(contains((Object) null)));

        Path preview = previewOf(pending);
        try {
            mockMvc.perform(get("/api/staff/new").header("Authorization", staffToken))
                    .andExpect(jsonPath(path).value(contains(matchesPattern("/uploads/thumbs/.+\\.jpg\\?exp=\\d+&sig=[\\w-]+"))));
        } finally {
            Files.deleteIfExists(preview);
        }
    }

    @Test
    void crossOriginRequestsAreNotAllowedByDefault() throws Exception {
        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
