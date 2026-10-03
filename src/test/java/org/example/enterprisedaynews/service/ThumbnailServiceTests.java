package org.example.enterprisedaynews.service;

import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Issue #42: small previews of uploads. */
class ThumbnailServiceTests {

    @TempDir
    Path uploads;

    private ThumbnailService thumbnails;

    @BeforeEach
    void setUp() {
        thumbnails = new ThumbnailService(uploads.toString());
    }

    @AfterEach
    void tearDown() {
        thumbnails.stop();
    }

    private String picture(String name, int width, int height, String format, boolean transparent) throws IOException {
        BufferedImage image = new BufferedImage(width, height,
                transparent ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.ORANGE);
        g.fillRect(0, 0, width / 2, height);
        g.dispose();
        ImageIO.write(image, format, uploads.resolve(name).toFile());
        return name;
    }

    @Test
    void makesASmallJpegOfABigPicture() throws IOException {
        String file = picture("big.png", 2400, 1200, "png", true);
        long originalSize = Files.size(uploads.resolve(file));

        assertThat(thumbnails.create(file)).isTrue();

        Path thumb = thumbnails.thumbnailOf(file);
        assertThat(thumb).isEqualTo(uploads.resolve("thumbs").resolve("big.png.jpg"));
        BufferedImage preview = ImageIO.read(thumb.toFile());
        assertThat(preview.getWidth()).isEqualTo(ThumbnailService.WIDTH);
        assertThat(preview.getHeight()).isEqualTo(240);
        assertThat(Files.size(thumb)).isLessThan(originalSize);
        // The see-through half is white, not black.
        Color right = new Color(preview.getRGB(400, 100));
        assertThat(right.getRed()).isGreaterThan(240);
        assertThat(thumbnails.hasThumbnail(file)).isTrue();
    }

    @Test
    void neverEnlargesASmallPicture() throws IOException {
        String file = picture("small.jpg", 300, 200, "jpg", false);

        thumbnails.create(file);

        BufferedImage preview = ImageIO.read(thumbnails.thumbnailOf(file).toFile());
        assertThat(preview.getWidth()).isEqualTo(300);
        assertThat(preview.getHeight()).isEqualTo(200);
    }

    @Test
    void readsWebp() throws IOException {
        // A 1x1 WebP: Java can't read these on its own; the TwelveMonkeys plugin makes it work.
        Files.write(uploads.resolve("tiny.webp"),
                Base64.getDecoder().decode("UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA="));

        assertThat(thumbnails.create("tiny.webp")).isTrue();
    }

    @Test
    void skipsWhatItCantReadOrShouldntTouch() throws IOException {
        Files.writeString(uploads.resolve("not-a-picture.png"), "hello");

        assertThat(thumbnails.create("not-a-picture.png")).isFalse();
        assertThat(thumbnails.create("missing.png")).isFalse();
        assertThat(thumbnails.create("../outside.png")).isFalse();
        assertThat(thumbnails.hasThumbnail("not-a-picture.png")).isFalse();
        assertThat(thumbnails.hasThumbnail(null)).isFalse();
    }

    @Test
    void makesThemInTheBackgroundAndDeletesThem() throws Exception {
        String file = picture("later.png", 1000, 500, "png", false);

        assertThat(thumbnails.createLater(file).get(10, TimeUnit.SECONDS)).isTrue();
        assertThat(thumbnails.createLater(file).get(10, TimeUnit.SECONDS)).isTrue(); // already there: fine

        thumbnails.delete(file);
        assertThat(thumbnails.hasThumbnail(file)).isFalse();
        thumbnails.delete(null); // nothing to do
    }

    @Test
    void startupQueuesPreviewsOnlyForUploadsWithoutOne() throws Exception {
        String done = picture("done.png", 600, 300, "png", false);
        thumbnails.create(done);
        String todo = picture("todo.png", 600, 300, "png", false);
        ImageRepository repository = mock(ImageRepository.class);
        when(repository.findAll()).thenReturn(List.of(
                ImageMetadata.builder().filePath(done).build(),
                ImageMetadata.builder().filePath(todo).build(),
                ImageMetadata.builder().messageText("text only").build()));

        int queued = new ThumbnailBackfill(repository, thumbnails).queueMissing();

        assertThat(queued).isEqualTo(1);
        thumbnails.createLater(todo).get(10, TimeUnit.SECONDS);
        assertThat(thumbnails.hasThumbnail(todo)).isTrue();
    }

    @Test
    void startupDoesNothingWhenThereAreNoUploads() {
        ThumbnailService mockThumbnails = mock(ThumbnailService.class);
        ImageRepository repository = mock(ImageRepository.class);
        when(repository.findAll()).thenReturn(List.of());

        new ThumbnailBackfill(repository, mockThumbnails).queueMissing();

        verify(mockThumbnails, never()).createLater(any());
    }
}
