package org.example.enterprisedaynews.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Guards {@code /uploads/**}: projector items are served to anyone, everything else needs a valid
 * signed link from {@link UploadUrlSigner}. Anything else gets a 404 so the response doesn't reveal
 * whether a file exists.
 */
@Component
@RequiredArgsConstructor
public class UploadAccessInterceptor implements HandlerInterceptor {

    private final ImageRepository imageRepository;
    private final UploadUrlSigner uploadUrlSigner;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (!path.startsWith(UploadUrlSigner.UPLOADS_PREFIX)) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return false;
        }
        String fileName = UriUtils.decode(path.substring(UploadUrlSigner.UPLOADS_PREFIX.length()), StandardCharsets.UTF_8);

        Optional<ImageMetadata> image = imageRepository.findFirstByFilePath(fileName);
        if (image.isEmpty()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return false;
        }
        if (UploadUrlSigner.isPubliclyVisible(image.get())) {
            return true;
        }
        if (uploadUrlSigner.isValid(fileName, request.getParameter("exp"), request.getParameter("sig"))) {
            // Not for shared caches: the same file may become private again (hidden or rejected).
            response.setHeader("Cache-Control", "private, max-age=3600");
            return true;
        }
        response.sendError(HttpServletResponse.SC_NOT_FOUND);
        return false;
    }
}
