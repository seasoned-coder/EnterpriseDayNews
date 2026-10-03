package org.example.enterprisedaynews.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.enterprisedaynews.service.StaffAccountService;
import org.example.enterprisedaynews.service.StudentAccountService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final StudentAccountService studentAccountService;
    private final StaffAccountService staffAccountService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtProvider.validateToken(token)) {
                String username = jwtProvider.getUsernameFromToken(token);
                String role = jwtProvider.getRoleFromToken(token);

                // Tokens only count while their account still exists and isn't locked, so locking or
                // deleting an account takes effect immediately rather than when the token expires.
                // A projector key counts while the staff member who issued it is active (issue #40).
                boolean activeAccount = switch (role == null ? "" : role) {
                    case Roles.STUDENT -> studentAccountService.findActiveAccount(username).isPresent();
                    case Roles.STAFF, Roles.PROJECTOR -> staffAccountService.findActiveAccount(username).isPresent();
                    default -> false;
                };

                if (username != null && activeAccount) {
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(Roles.ROLE_PREFIX + role);
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(username, null, List.of(authority));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
