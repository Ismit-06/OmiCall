package com.videoplatform.security;

import com.videoplatform.user.User;
import com.videoplatform.user.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Handles successful Google OIDC authentication.
 * Finds or creates the application user using the stable Google 'sub' identifier.
 * Stores the application user ID in the HTTP session for subsequent requests.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserService userService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private String getNormalizedFrontendUrl() {
        if (frontendUrl == null || frontendUrl.isBlank()) {
            return "http://localhost:5173";
        }
        String trimmed = frontendUrl.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return "https://" + trimmed;
        }
        return trimmed;
    }

    public OAuth2LoginSuccessHandler(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();

        String googleId = oidcUser.getSubject();
        String email = oidcUser.getEmail();
        String displayName = oidcUser.getFullName() != null ? oidcUser.getFullName() : email;
        String profilePicture = oidcUser.getPicture();

        User user = userService.findOrCreateFromGoogle(googleId, email, displayName, profilePicture);

        // Store user ID in session — this is the canonical identity reference
        request.getSession().setAttribute("userId", user.getId());
        request.getSession().setAttribute("userRole", user.getRole());

        // Redirect to frontend after login
        response.sendRedirect(getNormalizedFrontendUrl() + "?login=success");
    }
}
