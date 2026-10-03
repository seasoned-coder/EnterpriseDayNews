package org.example.enterprisedaynews.config;

import org.example.enterprisedaynews.security.JwtAuthenticationFilter;
import org.example.enterprisedaynews.security.Roles;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final List<String> allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          @Value("${app.cors.allowed-origins:}") List<String> allowedOrigins) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // CSRF disabled — stateless REST API authenticated by JWT.
        http.csrf(csrf -> csrf.disable());
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        // No valid sign-in (none, expired, or the account was locked/renamed/deleted) -> 401, so the
        // frontend sends the user back to sign in. Signed in but the wrong role stays 403.
        http.exceptionHandling(e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)));

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/student/**").hasRole(Roles.STUDENT)
                .requestMatchers("/api/staff/**").hasRole(Roles.STAFF)
                // The projector only reads; changing its settings is a staff action.
                .requestMatchers(HttpMethod.GET, "/api/projector/**").permitAll()
                .requestMatchers("/api/projector/**").hasRole(Roles.STAFF)
                // Access to individual files is decided by UploadAccessInterceptor (public or signed link).
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                // Let error responses (e.g. the 404 for a hidden upload) through as-is instead of turning into 403.
                .requestMatchers("/error").permitAll()
                .anyRequest().authenticated()
        );
        return http.build();
    }

    /**
     * The frontend is served from the same origin as the API (nginx proxies /api), so no cross-origin
     * access is allowed by default. Set APP_CORS_ALLOWED_ORIGINS only if the frontend is hosted elsewhere
     * (VITE_API_BASE_URL).
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        if (!allowedOrigins.isEmpty()) {
            CorsConfiguration configuration = new CorsConfiguration();
            configuration.setAllowedOrigins(allowedOrigins);
            configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
            configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
            configuration.setAllowCredentials(false);
            source.registerCorsConfiguration("/**", configuration);
        }
        return source;
    }

}
