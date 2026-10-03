package org.example.enterprisedaynews.security;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.service.ThumbnailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;

/**
 * Builds image URLs. Items currently shown on the projector are public; every other upload
 * (awaiting review, rejected, hidden) is only reachable through a signed, expiring link that the API
 * hands to staff and to the student who uploaded it. Plain {@code <img>} tags can't send a JWT, which
 * is why the authorisation travels in the URL.
 */
@Component
public class UploadUrlSigner {

    static final String UPLOADS_PREFIX = "/uploads/";
    static final String THUMBS_PREFIX = ThumbnailService.FOLDER + "/";

    /** Links stay identical for a whole hour so polling dashboards don't re-download every image. */
    private static final long WINDOW_SECONDS = 3600;

    private final byte[] key;
    private final Clock clock;

    @Autowired
    public UploadUrlSigner(SigningSecret signingSecret) {
        this(signingSecret.value(), Clock.systemUTC());
    }

    UploadUrlSigner(String signingSecret, Clock clock) {
        // Derived from the login-token secret so there is no extra secret to manage.
        this.key = hmac(signingSecret.getBytes(StandardCharsets.UTF_8), "upload-url-signing-v1");
        this.clock = clock;
    }

    /** True for exactly the items the projector shows: active FLASH items, or approved items set to display. */
    public static boolean isPubliclyVisible(ImageMetadata image) {
        return image.isFlashMode()
                || (image.getStatus() == ImageMetadata.ApprovalStatus.APPROVED && image.isDisplay());
    }

    /** URL for an image, signed unless the image is public. {@code null} for items without a file. */
    public String urlFor(ImageMetadata image) {
        return signedUrl(image, "", "");
    }

    /**
     * URL for an image's small preview (issue #42): {@code /uploads/thumbs/<file>.jpg}, with the same
     * signature as the picture itself, so it has exactly the same access rules.
     */
    public String thumbnailUrlFor(ImageMetadata image) {
        return signedUrl(image, THUMBS_PREFIX, ThumbnailService.SUFFIX);
    }

    /**
     * The picture a requested upload path belongs to: itself, or for a preview ({@code thumbs/<file>.jpg}) the
     * picture it was made from. Access is always decided by the picture.
     */
    public static String pictureFileFor(String requestedName) {
        if (requestedName.startsWith(THUMBS_PREFIX) && requestedName.endsWith(ThumbnailService.SUFFIX)) {
            return requestedName.substring(THUMBS_PREFIX.length(),
                    requestedName.length() - ThumbnailService.SUFFIX.length());
        }
        return requestedName;
    }

    private String signedUrl(ImageMetadata image, String prefix, String suffix) {
        String fileName = image.getFilePath();
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        String path = UPLOADS_PREFIX + prefix + UriUtils.encodePathSegment(fileName + suffix, StandardCharsets.UTF_8);
        if (isPubliclyVisible(image)) {
            return path;
        }
        // Expires at the end of the next whole window: valid for 1-2 hours, stable within the hour.
        long expires = (clock.instant().getEpochSecond() / WINDOW_SECONDS + 2) * WINDOW_SECONDS;
        return path + "?exp=" + expires + "&sig=" + sign(fileName, expires);
    }

    public boolean isValid(String fileName, String exp, String sig) {
        if (fileName == null || exp == null || sig == null) {
            return false;
        }
        long expires;
        try {
            expires = Long.parseLong(exp);
        } catch (NumberFormatException e) {
            return false;
        }
        if (expires <= clock.instant().getEpochSecond()) {
            return false;
        }
        return MessageDigest.isEqual(
                sign(fileName, expires).getBytes(StandardCharsets.US_ASCII),
                sig.getBytes(StandardCharsets.US_ASCII));
    }

    private String sign(String fileName, long expires) {
        byte[] mac = hmac(key, fileName + "\n" + expires);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac);
    }

    private static byte[] hmac(byte[] key, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 unavailable", e);
        }
    }
}
