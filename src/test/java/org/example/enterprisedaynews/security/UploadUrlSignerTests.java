package org.example.enterprisedaynews.security;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.model.ImageMetadata.ApprovalStatus;
import org.junit.jupiter.api.Test;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;

class UploadUrlSignerTests {

    private static final String SECRET = "upload-signer-test-secret-long-enough";
    private static final Instant NOW = Instant.parse("2026-10-03T10:15:00Z");

    private static UploadUrlSigner signerAt(Instant now) {
        return new UploadUrlSigner(SECRET, Clock.fixed(now, ZoneOffset.UTC));
    }

    private static ImageMetadata image(String file, ApprovalStatus status, boolean display, boolean flash) {
        ImageMetadata m = new ImageMetadata();
        m.setFilePath(file);
        m.setStatus(status);
        m.setDisplay(display);
        m.setFlashMode(flash);
        return m;
    }

    private static UriComponents parse(String url) {
        return UriComponentsBuilder.fromUriString(url).build();
    }

    @Test
    void projectorItemsGetPlainPublicUrls() {
        UploadUrlSigner signer = signerAt(NOW);

        assertEquals("/uploads/a.jpg", signer.urlFor(image("a.jpg", ApprovalStatus.APPROVED, true, false)));
        assertEquals("/uploads/b.jpg", signer.urlFor(image("b.jpg", ApprovalStatus.APPROVED, false, true)));
    }

    @Test
    void everythingElseGetsASignedUrl() {
        UploadUrlSigner signer = signerAt(NOW);

        for (ImageMetadata m : new ImageMetadata[]{
                image("new.jpg", ApprovalStatus.NEW, false, false),
                image("hidden.jpg", ApprovalStatus.APPROVED, false, false),
                image("rejected.jpg", ApprovalStatus.REJECTED, false, false)}) {
            UriComponents url = parse(signer.urlFor(m));
            assertEquals("/uploads/" + m.getFilePath(), url.getPath());
            assertTrue(signer.isValid(m.getFilePath(), url.getQueryParams().getFirst("exp"),
                    url.getQueryParams().getFirst("sig")), m.getFilePath());
        }
    }

    @Test
    void signedUrlIsStableWithinTheHour() {
        ImageMetadata m = image("new.jpg", ApprovalStatus.NEW, false, false);

        assertEquals(signerAt(NOW).urlFor(m), signerAt(NOW.plusSeconds(40 * 60)).urlFor(m));
        assertNotEquals(signerAt(NOW).urlFor(m), signerAt(NOW.plusSeconds(60 * 60)).urlFor(m));
    }

    @Test
    void signedUrlExpires() {
        UriComponents url = parse(signerAt(NOW).urlFor(image("new.jpg", ApprovalStatus.NEW, false, false)));
        String exp = url.getQueryParams().getFirst("exp");
        String sig = url.getQueryParams().getFirst("sig");

        assertTrue(signerAt(NOW.plusSeconds(60 * 60)).isValid("new.jpg", exp, sig));
        assertFalse(signerAt(NOW.plusSeconds(2 * 60 * 60)).isValid("new.jpg", exp, sig));
    }

    @Test
    void tamperedLinksAreRejected() {
        UploadUrlSigner signer = signerAt(NOW);
        UriComponents url = parse(signer.urlFor(image("new.jpg", ApprovalStatus.NEW, false, false)));
        String exp = url.getQueryParams().getFirst("exp");
        String sig = url.getQueryParams().getFirst("sig");

        assertFalse(signer.isValid("other.jpg", exp, sig), "signature is bound to the file");
        assertFalse(signer.isValid("new.jpg", String.valueOf(Long.parseLong(exp) + 3600), sig), "expiry can't be extended");
        assertFalse(signer.isValid("new.jpg", exp, sig.substring(1)));
        assertFalse(signer.isValid("new.jpg", "soon", sig));
        assertFalse(signer.isValid("new.jpg", null, null));
        assertFalse(new UploadUrlSigner("a-different-secret-that-is-long-enough", Clock.fixed(NOW, ZoneOffset.UTC))
                .isValid("new.jpg", exp, sig), "links from another deployment's secret don't work");
    }

    @Test
    void fileNamesAreUrlEncoded() {
        String url = signerAt(NOW).urlFor(image("abc_my advert #1.jpg", ApprovalStatus.APPROVED, true, false));
        assertEquals("/uploads/abc_my%20advert%20%231.jpg", url);
    }

    @Test
    void textOnlyMessagesHaveNoUrl() {
        assertNull(signerAt(NOW).urlFor(image(null, ApprovalStatus.APPROVED, true, true)));
    }
}
