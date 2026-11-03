package com.videoplatform.config;

import com.videoplatform.user.User;
import com.videoplatform.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Securely bootstraps the initial admin user.
 * 
 * Only runs when ADMIN_BOOTSTRAP_ENABLED=true and ADMIN_BOOTSTRAP_GOOGLE_ID is set.
 * After the first admin is bootstrapped, set ADMIN_BOOTSTRAP_ENABLED=false to prevent
 * any future unauthorized admin elevation.
 * 
 * The bootstrap works after the target Google user has logged in at least once
 * (so their user record exists in the database).
 */
@Component
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    @Value("${app.admin.bootstrap-enabled:false}")
    private boolean bootstrapEnabled;

    @Value("${app.admin.bootstrap-google-id:}")
    private String bootstrapGoogleId;

    private final UserRepository userRepository;

    public AdminBootstrap(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void bootstrapAdmin() {
        if (!bootstrapEnabled) {
            return;
        }

        if (bootstrapGoogleId == null || bootstrapGoogleId.isBlank()) {
            log.warn("Admin bootstrap is enabled but ADMIN_BOOTSTRAP_GOOGLE_ID is not set. Skipping.");
            return;
        }

        userRepository.findByGoogleId(bootstrapGoogleId).ifPresentOrElse(
                user -> {
                    if (!"ROLE_ADMIN".equals(user.getRole())) {
                        user.setRole("ROLE_ADMIN");
                        userRepository.save(user);
                        log.info("Admin bootstrap: Elevated user {} (googleId={}) to ROLE_ADMIN",
                                user.getId(), bootstrapGoogleId);
                        log.warn("IMPORTANT: Set ADMIN_BOOTSTRAP_ENABLED=false now to prevent future unauthorized elevation.");
                    } else {
                        log.info("Admin bootstrap: User {} is already ROLE_ADMIN. No action taken.", user.getId());
                    }
                },
                () -> log.warn("Admin bootstrap: No user found with googleId={}. " +
                        "The user must login via Google OAuth first before being promoted.", bootstrapGoogleId)
        );
    }
}
