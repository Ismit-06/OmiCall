package com.videoplatform.security;

import com.videoplatform.user.User;
import com.videoplatform.user.UserDto;
import com.videoplatform.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthContext authContext;
    private final UserService userService;

    public AuthController(AuthContext authContext, UserService userService) {
        this.authContext = authContext;
        this.userService = userService;
    }

    /**
     * Returns the current authenticated user's info.
     * Frontend polls this to determine login state.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpServletRequest request) {
        Optional<Long> userIdOpt = authContext.getCurrentUserId(request);
        if (userIdOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }

        Optional<User> userOpt = userService.findById(userIdOpt.get());
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }

        User user = userOpt.get();
        UserDto dto = UserDto.fromEntity(user);

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", dto
        ));
    }

    /**
     * Dev-only helper endpoint to simulate login in development when Google OAuth client credentials
     * are not yet configured or when running offline.
     */
    @PostMapping("/dev-login")
    public ResponseEntity<?> devLogin(@RequestBody(required = false) Map<String, String> body,
                                      @RequestParam(required = false) String email,
                                      @RequestParam(required = false) String name,
                                      @RequestParam(required = false) String role,
                                      HttpServletRequest request) {
        String effEmail = (body != null && body.get("email") != null) ? body.get("email") : (email != null ? email : "demo@example.com");
        String effName = (body != null && body.get("name") != null) ? body.get("name") : (name != null ? name : "Demo User");
        String effRoleParam = (body != null && body.get("role") != null) ? body.get("role") : role;
        String effRole = ("admin".equalsIgnoreCase(effRoleParam) || "ROLE_ADMIN".equalsIgnoreCase(effRoleParam)) ? "ROLE_ADMIN" : "ROLE_USER";
        String googleId = "dev-" + effEmail.replaceAll("[^a-zA-Z0-9]", "_");

        User user = userService.findOrCreateFromGoogle(googleId, effEmail, effName, null);
        if (!user.getRole().equals(effRole)) {
            user = userService.setRole(user.getId(), effRole);
        }

        request.getSession().setAttribute("userId", user.getId());
        request.getSession().setAttribute("userRole", user.getRole());

        // Explicitly set Spring Security authentication in the session
        var authorities = java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(user.getRole()));
        var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(user.getEmail(), null, authorities);
        var context = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        org.springframework.security.core.context.SecurityContextHolder.setContext(context);
        request.getSession().setAttribute(org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", UserDto.fromEntity(user)
        ));
    }
    @GetMapping("/login-url")
    public ResponseEntity<?> getLoginUrl(HttpServletRequest request) {
        String baseUrl = request.getScheme() + "://" + request.getServerName();
        if (request.getServerPort() != 80 && request.getServerPort() != 443) {
            baseUrl += ":" + request.getServerPort();
        }
        return ResponseEntity.ok(Map.of(
                "loginUrl", baseUrl + "/oauth2/authorization/google"
        ));
    }
}
