package com.videoplatform.security;

import com.videoplatform.user.User;
import com.videoplatform.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Checks user status on every authenticated request.
 * Suspended and banned users are rejected immediately.
 * This filter runs after authentication and before controllers.
 */
@Component
public class UserStatusFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public UserStatusFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        HttpSession session = request.getSession(false);

        if (session != null && session.getAttribute("userId") != null) {
            Long userId = (Long) session.getAttribute("userId");
            Optional<User> userOpt = userRepository.findById(userId);

            if (userOpt.isPresent()) {
                User user = userOpt.get();
                if (!user.isActive()) {
                    // Clear session for suspended/banned user
                    session.invalidate();
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Account is " + user.getStatus().name().toLowerCase() + "\",\"status\":\"" + user.getStatus().name() + "\"}");
                    return;
                }
                // Attach user to request for downstream use
                request.setAttribute("currentUser", user);

                // Ensure Spring Security's SecurityContextHolder recognizes the user and current role
                var authorities = java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(user.getRole()));
                var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
                var context = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
                context.setAuthentication(auth);
                org.springframework.security.core.context.SecurityContextHolder.setContext(context);
                session.setAttribute(org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Allow health, login, and OAuth callback through without status check
        return path.equals("/api/health")
                || path.startsWith("/oauth2/")
                || path.startsWith("/login/oauth2/");
    }
}
