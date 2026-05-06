package org.example.enterprisedaynews.service;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.enterprisedaynews.model.ImageMetadata;
import org.example.enterprisedaynews.repository.ImageRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScreenshotService {

    private final ImageRepository imageRepository;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:}")
    private String chromiumPath;

    private Playwright playwright;
    private Browser browser;

    @PostConstruct
    public void init() {
        try {
            log.info("Initializing Playwright...");
            playwright = Playwright.create();
            BrowserType.LaunchOptions options = new BrowserType.LaunchOptions().setHeadless(true);
            if (chromiumPath != null && !chromiumPath.isBlank()) {
                log.info("Using custom Chromium executable: {}", chromiumPath);
                Path path = Paths.get(chromiumPath);
                if (Files.exists(path)) {
                    log.info("Verified Chromium executable path: {}", chromiumPath);
                    options.setExecutablePath(path);
                } else {
                    log.warn("Configured Chromium path does not exist: {}. Searching for alternatives...", chromiumPath);
                    Path altPath = findChromiumBinary();
                    if (altPath != null) {
                        log.info("Found Chromium at: {}", altPath);
                        options.setExecutablePath(altPath);
                    } else {
                        log.error("Could not find Chromium binary. Playwright initialization will likely fail.");
                    }
                }
            }
            browser = playwright.chromium().launch(options);
            log.info("Playwright initialized successfully.");
        } catch (Exception e) {
            log.error("Failed to initialize Playwright: {}", e.getMessage(), e);
        }
    }

    @PreDestroy
    public void cleanup() {
        if (browser != null) {
            browser.close();
        }
        if (playwright != null) {
            playwright.close();
        }
    }

    private Path findChromiumBinary() {
        String[] commonPaths = {
                "/usr/bin/chromium",
                "/usr/bin/chromium-browser",
                "/usr/bin/google-chrome",
                "/usr/bin/chrome"
        };
        for (String p : commonPaths) {
            Path path = Paths.get(p);
            if (Files.exists(path)) {
                return path;
            }
        }
        return null;
    }

    @Scheduled(fixedDelay = 10000)
    public void captureScreenshots() {
        List<ImageMetadata> activeUrls = imageRepository.findByIsInfoMessageAndExternalUrlIsNotNull(true);
        for (ImageMetadata metadata : activeUrls) {
            if (metadata.isDisplay()) {
                try {
                    captureScreenshot(metadata);
                } catch (Exception e) {
                    log.error("Failed to capture screenshot for {}: {}", metadata.getExternalUrl(), e.getMessage());
                }
            }
        }
    }

    public void captureScreenshot(ImageMetadata metadata) throws IOException {
        String url = metadata.getExternalUrl();
        if (url == null || url.isBlank()) return;

        if (browser == null) {
            log.error("Cannot capture screenshot: Playwright browser not initialized.");
            return;
        }

        log.info("Capturing screenshot for URL: {}", url);
        
        try (Page page = browser.newPage()) {
            page.setViewportSize(1280, 720);
            
            // Navigate with a timeout to avoid hanging
            page.navigate(url, new Page.NavigateOptions().setTimeout(30000));
            
            // Wait a bit for the page to render (some sites are slow/SPA)
            page.waitForTimeout(2000);

            byte[] imageBytes = page.screenshot(new Page.ScreenshotOptions()
                    .setType(com.microsoft.playwright.options.ScreenshotType.JPEG)
                    .setQuality(80));

            if (imageBytes != null && imageBytes.length > 0) {
                String fileName = "screenshot_" + UUID.randomUUID() + ".jpg";
                Path uploadPath = Paths.get(uploadDir);
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                Path filePath = uploadPath.resolve(fileName);
                Files.write(filePath, imageBytes);

                // Delete old screenshot if it exists
                if (metadata.getScreenshotPath() != null) {
                    try {
                        Files.deleteIfExists(uploadPath.resolve(metadata.getScreenshotPath()));
                    } catch (IOException e) {
                        log.warn("Could not delete old screenshot {}: {}", metadata.getScreenshotPath(), e.getMessage());
                    }
                }

                metadata.setScreenshotPath(fileName);
                metadata.setLastScreenshotAt(LocalDateTime.now());
                imageRepository.save(metadata);
                log.info("Screenshot saved as: {}", fileName);
            }
        } catch (Exception e) {
            log.error("Failed to capture screenshot locally for {}: {}", url, e.getMessage());
        }
    }
}
