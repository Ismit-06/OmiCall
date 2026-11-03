package com.videoplatform.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Finds or creates a user from Google OIDC attributes.
     * Uses googleId (sub claim) as the stable identity, never email alone.
     */
    @Transactional
    public User findOrCreateFromGoogle(String googleId, String email, String displayName, String profilePicture) {
        Optional<User> existing = userRepository.findByGoogleId(googleId);
        if (existing.isPresent()) {
            User user = existing.get();
            // Update profile info from Google on each login
            user.setEmail(email);
            user.setDisplayName(displayName);
            user.setProfilePicture(profilePicture);
            return userRepository.save(user);
        }

        User newUser = new User(googleId, email, displayName, profilePicture);
        return userRepository.save(newUser);
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }

    public List<User> searchUsers(String query) {
        return userRepository.searchUsers(query);
    }

    public List<User> findByStatus(UserStatus status) {
        return userRepository.findByStatus(status);
    }

    @Transactional
    public User updateStatus(Long userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setStatus(status);
        return userRepository.save(user);
    }

    @Transactional
    public User setRole(Long userId, String role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setRole(role);
        return userRepository.save(user);
    }

    public long countAll() {
        return userRepository.count();
    }

    public long countByStatus(UserStatus status) {
        return userRepository.countByStatus(status);
    }

    /**
     * Verify a user is active and allowed to perform operations.
     */
    public boolean isUserAllowed(Long userId) {
        return userRepository.findById(userId)
                .map(User::isActive)
                .orElse(false);
    }
}
