package com.videoplatform.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
class UserServiceTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void findOrCreateFromGoogle_createsNewUser() {
        User user = userService.findOrCreateFromGoogle("google-123", "test@example.com", "Test User", "https://pic.url");

        assertNotNull(user.getId());
        assertEquals("google-123", user.getGoogleId());
        assertEquals("test@example.com", user.getEmail());
        assertEquals("Test User", user.getDisplayName());
        assertEquals(UserStatus.ACTIVE, user.getStatus());
        assertEquals("ROLE_USER", user.getRole());
    }

    @Test
    void findOrCreateFromGoogle_updatesExistingUser() {
        userService.findOrCreateFromGoogle("google-456", "old@example.com", "Old Name", null);
        User updated = userService.findOrCreateFromGoogle("google-456", "new@example.com", "New Name", "https://new-pic.url");

        assertEquals("new@example.com", updated.getEmail());
        assertEquals("New Name", updated.getDisplayName());
        assertEquals("https://new-pic.url", updated.getProfilePicture());
        // Should be same record
        assertEquals(1, userRepository.findAll().stream().filter(u -> u.getGoogleId().equals("google-456")).count());
    }

    @Test
    void updateStatus_suspendedUserIsNotActive() {
        User user = userService.findOrCreateFromGoogle("google-789", "u@test.com", "User", null);
        userService.updateStatus(user.getId(), UserStatus.SUSPENDED);

        User found = userService.findById(user.getId()).orElseThrow();
        assertFalse(found.isActive());
        assertEquals(UserStatus.SUSPENDED, found.getStatus());
    }

    @Test
    void updateStatus_bannedUserIsNotActive() {
        User user = userService.findOrCreateFromGoogle("google-ban", "ban@test.com", "Ban User", null);
        userService.updateStatus(user.getId(), UserStatus.BANNED);

        assertFalse(userService.isUserAllowed(user.getId()));
    }

    @Test
    void setRole_canPromoteToAdmin() {
        User user = userService.findOrCreateFromGoogle("google-admin", "admin@test.com", "Admin", null);
        userService.setRole(user.getId(), "ROLE_ADMIN");

        User found = userService.findById(user.getId()).orElseThrow();
        assertTrue(found.isAdmin());
    }

    @Test
    void searchUsers_findsByNameOrEmail() {
        userService.findOrCreateFromGoogle("g-search1", "alice@test.com", "Alice Smith", null);
        userService.findOrCreateFromGoogle("g-search2", "bob@test.com", "Bob Jones", null);

        assertEquals(1, userService.searchUsers("alice").size());
        assertEquals(1, userService.searchUsers("bob@test").size());
        assertEquals(0, userService.searchUsers("charlie").size());
    }
}
