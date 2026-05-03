package org.example.enterprisedaynews.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.enterprisedaynews.security.Roles;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Mock authentication filter for development and test profiles only.
 *
 * <p>Reads the {@link Roles#HEADER_USER} and {@link Roles#HEADER_ROLE} headers and
 * populates the security context. <strong>Never</strong> active in {@code prod}, where
 * a real auth provider (JWT/OAuth2) must be configured.
 */
@Component
@Profile({"dev", "test", "default"})
public class MockAuthFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String username = request.getHeader(Roles.HEADER_USER);
        String role = request.getHeader(Roles.HEADER_ROLE);

        if (username != null && !username.isBlank() && role != null && !role.isBlank()) {
            SimpleGrantedAuthority authority = new SimpleGrantedAuthority(Roles.ROLE_PREFIX + role);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(username, null, List.of(authority));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
