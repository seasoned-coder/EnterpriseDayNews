package org.example.enterprisedaynews.config;

import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.security.UploadAccessInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final UploadAccessInterceptor uploadAccessInterceptor;

    @Value("${app.upload-dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = "file:" + uploadPath.toString().replace("\\", "/") + "/";

        // Every upload gets a new, random file name and is never changed, so browsers can keep their copy
        // instead of downloading it again over the event Wi-Fi each time the projector or a dashboard shows it
        // (issue #36). "private": only that browser keeps it, never a shared cache.
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location)
                .setCacheControl(UPLOAD_CACHING);
    }

    static final CacheControl UPLOAD_CACHING = CacheControl.maxAge(Duration.ofHours(1)).cachePrivate();

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(uploadAccessInterceptor).addPathPatterns("/uploads/**");
    }

    // CORS is configured in SecurityConfig (same-origin only unless APP_CORS_ALLOWED_ORIGINS is set).
}
