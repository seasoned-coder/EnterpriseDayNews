package org.example.enterprisedaynews.service;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Small previews of uploads for cards and lists (issue #42): about 480 px wide JPEGs, typically 30-60 KB
 * instead of several MB, which matters on the event Wi-Fi with 100+ phones. The full picture is still used
 * for the large preview and the projector.
 *
 * <p>Previews are made one at a time in the background, so a burst of uploads doesn't slow the server or
 * the uploads down; until one exists, the full picture is used. They live in {@code <upload-dir>/thumbs/}
 * as {@code <file name>.jpg} and share their picture's access rules (UploadAccessInterceptor).
 */
@Slf4j
@Service
public class ThumbnailService {

    public static final String FOLDER = "thumbs";
    public static final String SUFFIX = ".jpg";
    static final int WIDTH = 480;
    private static final float QUALITY = 0.8f;

    private final Path uploadDir;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "thumbnails");
        t.setDaemon(true);
        return t;
    });

    public ThumbnailService(@Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    /** Where an upload's preview is (or will be). */
    public Path thumbnailOf(String fileName) {
        return uploadDir.resolve(FOLDER).resolve(fileName + SUFFIX);
    }

    public boolean hasThumbnail(String fileName) {
        return fileName != null && !fileName.isBlank() && Files.isRegularFile(thumbnailOf(fileName));
    }

    /** Makes the preview in the background, unless it already exists. */
    public Future<Boolean> createLater(String fileName) {
        return worker.submit(() -> hasThumbnail(fileName) || create(fileName));
    }

    /**
     * Makes the preview now. Never throws: a picture Java can't read (or a broken file) just gets no preview,
     * and the full picture is used instead.
     *
     * @return whether a preview was made
     */
    boolean create(String fileName) {
        Path original = uploadDir.resolve(fileName).normalize();
        if (!original.startsWith(uploadDir) || !Files.isRegularFile(original)) {
            return false;
        }
        try {
            BufferedImage source = ImageIO.read(original.toFile());
            if (source == null) {
                log.info("No preview for {}: not a picture Java can read", fileName);
                return false;
            }
            Path thumb = thumbnailOf(fileName);
            Files.createDirectories(thumb.getParent());
            Path partial = thumb.resolveSibling(thumb.getFileName() + ".part");
            writeJpeg(shrink(source), partial);
            Files.move(partial, thumb, StandardCopyOption.REPLACE_EXISTING,
                    StandardCopyOption.ATOMIC_MOVE);
            return true;
        } catch (IOException | RuntimeException e) {
            log.warn("Couldn't make a preview of {}: {}", fileName, e.getMessage());
            return false;
        }
    }

    /** Deletes an upload's preview, if it has one. */
    public void delete(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(thumbnailOf(fileName));
        } catch (IOException e) {
            log.warn("Couldn't delete the preview of {}", fileName, e);
        }
    }

    /**
     * Scales down to WIDTH (never up), halving in steps for a smooth result, onto white (JPEG has no
     * transparency, and a PNG's see-through parts would otherwise turn black).
     */
    static BufferedImage shrink(BufferedImage source) {
        int width = Math.min(WIDTH, source.getWidth());
        int height = Math.max(1, Math.round(source.getHeight() * (width / (float) source.getWidth())));
        BufferedImage current = source;
        int w = source.getWidth();
        int h = source.getHeight();
        do {
            w = Math.max(width, w / 2);
            h = Math.max(height, h / 2);
            BufferedImage step = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = step.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, w, h);
            g.drawImage(current, 0, 0, w, h, null);
            g.dispose();
            current = step;
        } while (w > width || h > height);
        return current;
    }

    private static void writeJpeg(BufferedImage image, Path target) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam params = writer.getDefaultWriteParam();
        params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        params.setCompressionQuality(QUALITY);
        try (ImageOutputStream out = ImageIO.createImageOutputStream(target.toFile())) {
            writer.setOutput(out);
            writer.write(null, new IIOImage(image, null, null), params);
        } finally {
            writer.dispose();
        }
    }

    @PreDestroy
    void stop() {
        worker.shutdownNow();
    }
}
