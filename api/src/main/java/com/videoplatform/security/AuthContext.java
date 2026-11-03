package com.videoplatform.security;

import com.videoplatform.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Utility for retrieving the current authenticated user from the request context.
 * Used by controllers and services to identify the caller without touching OAuth internals.
 */
@Component
public class AuthContext {

    /**
     * Get the current user's ID from the session, if authenticated.
     */
    public Optional<Long> getCurrentUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return Optional.empty();
        Object userId = session.getAttribute("userId");
        return userId != null ? Optional.of((Long) userId) : Optional.empty();
    }

    /**
     * Get the current User entity if it was attached by UserStatusFilter.
     */
    public Optional<User> getCurrentUser(HttpServletRequest request) {
        Object user = request.getAttribute("currentUser");
        return user != null ? Optional.of((User) user) : Optional.empty();
    }

    /**
     * Get the current user's role from the session.
     */
    public String getCurrentRole(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return "ROLE_USER";
        Object role = session.getAttribute("userRole");
        return role != null ? (String) role : "ROLE_USER";
    }

    /**
     * Check if the current user is an admin.
     */
    public boolean isAdmin(HttpServletRequest request) {
        return "ROLE_ADMIN".equals(getCurrentRole(request));
    }

    /**
     * Require authentication — throws if not authenticated.
     */
    public Long requireUserId(HttpServletRequest request) {
        return getCurrentUserId(request)
                .orElseThrow(() -> new SecurityException("Authentication required"));
    }

    /**
     * Require admin role — throws if not admin.
     */
    public Long requireAdmin(HttpServletRequest request) {
        Long userId = requireUserId(request);
        if (!isAdmin(request)) {
            throw new SecurityException("Admin access required");
        }
        return userId;
    }
}
