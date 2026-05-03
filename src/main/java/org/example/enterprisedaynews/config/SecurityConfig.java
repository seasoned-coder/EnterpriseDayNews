package org.example.enterprisedaynews.config;

import org.example.enterprisedaynews.security.Roles;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ObjectProvider<MockAuthFilter> mockAuthFilterProvider;

    public SecurityConfig(ObjectProvider<MockAuthFilter> mockAuthFilterProvider) {
        this.mockAuthFilterProvider = mockAuthFilterProvider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        // CSRF disabled — stateless REST API authenticated by header/JWT.
        http.csrf(csrf -> csrf.disable());

        // Only register the mock filter when its bean is present (i.e. dev/test profiles).
        MockAuthFilter mockAuthFilter = mockAuthFilterProvider.getIfAvailable();
        if (mockAuthFilter != null) {
            http.addFilterBefore(mockAuthFilter, UsernamePasswordAuthenticationFilter.class);
        }

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/student/**").hasRole(Roles.STUDENT)
                .requestMatchers("/api/staff/**").hasRole(Roles.STAFF)
                .requestMatchers("/api/projector/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .anyRequest().authenticated()
        );
        // H2 console runs in a frame in dev.
        http.headers(h -> h.frameOptions(f -> f.sameOrigin()));
        return http.build();
    }
}
