package com.videoplatform.match;

import com.videoplatform.block.BlockRepository;
import com.videoplatform.call.LiveKitTokenService;
import com.videoplatform.user.User;
import com.videoplatform.user.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class MatchService {

    public static class QueueEntry {
        private final Long userId;
        private final List<String> interests;
        private final String language;
        private final String country;
        private final String preferredGender;
        private final Instant queuedAt;

        public QueueEntry(Long userId, List<String> interests, String language, String country, String preferredGender) {
            this.userId = userId;
            this.interests = interests != null ? interests : Collections.emptyList();
            this.language = language;
            this.country = country;
            this.preferredGender = preferredGender;
            this.queuedAt = Instant.now();
        }

        public Long getUserId() { return userId; }
        public List<String> getInterests() { return interests; }
        public String getLanguage() { return language; }
        public String getCountry() { return country; }
        public String getPreferredGender() { return preferredGender; }
    }

    private final Queue<QueueEntry> queue = new ConcurrentLinkedQueue<>();
    private final Map<Long, QueueEntry> userQueueMap = new ConcurrentHashMap<>();

    private final MatchRepository matchRepository;
    private final BlockRepository blockRepository;
    private final LiveKitTokenService liveKitTokenService;
    private final UserService userService;

    public MatchService(MatchRepository matchRepository,
                        BlockRepository blockRepository,
                        LiveKitTokenService liveKitTokenService,
                        UserService userService) {
        this.matchRepository = matchRepository;
        this.blockRepository = blockRepository;
        this.liveKitTokenService = liveKitTokenService;
        this.userService = userService;
    }

    @Transactional
    public synchronized Optional<MatchResultDto> enterQueue(Long userId, List<String> interests,
                                                            String language, String country,
                                                            String preferredGender) {
        // Prevent if user is suspended/banned
        if (!userService.isUserAllowed(userId)) {
            throw new SecurityException("User account is not active");
        }

        // Cancel any existing active match for this user
        cancelActiveMatch(userId);

        // Remove old entry from queue if present
        leaveQueue(userId);

        QueueEntry newEntry = new QueueEntry(userId, interests, language, country, preferredGender);

        // Find candidate in queue
        QueueEntry matchedCandidate = null;
        for (QueueEntry candidate : queue) {
            if (candidate.getUserId().equals(userId)) continue;

            // Enforce blocks
            if (blockRepository.isPairBlocked(userId, candidate.getUserId())) {
                continue;
            }

            // Simple compatibility score (prioritizes language & interests)
            matchedCandidate = candidate;
            break;
        }

        if (matchedCandidate != null) {
            queue.remove(matchedCandidate);
            userQueueMap.remove(matchedCandidate.getUserId());

            // Create match
            String roomName = "match_" + UUID.randomUUID().toString().substring(0, 12);
            Match match = new Match(userId, matchedCandidate.getUserId(), roomName);
            match = matchRepository.save(match);

            User user1 = userService.findById(userId).orElseThrow();
            User user2 = userService.findById(matchedCandidate.getUserId()).orElseThrow();

            String token = liveKitTokenService.generateToken(roomName, String.valueOf(user1.getId()), user1.getDisplayName());

            return Optional.of(new MatchResultDto(
                    match.getId(),
                    token,
                    liveKitTokenService.getLivekitUrl(),
                    roomName,
                    user2.getId(),
                    user2.getDisplayName(),
                    user2.getProfilePicture()
            ));
        }

        // Otherwise push into queue
        queue.add(newEntry);
        userQueueMap.put(userId, newEntry);
        return Optional.empty();
    }

    public void leaveQueue(Long userId) {
        QueueEntry entry = userQueueMap.remove(userId);
        if (entry != null) {
            queue.remove(entry);
        }
    }

    @Transactional
    public void cancelActiveMatch(Long userId) {
        matchRepository.findActiveMatchByUserId(userId).ifPresent(match -> {
            match.setStatus("ENDED");
            match.setEndedAt(Instant.now());
            matchRepository.save(match);
        });
    }

    public Optional<MatchResultDto> getStatus(Long userId) {
        // Check if user is in an active match
        Optional<Match> activeMatchOpt = matchRepository.findActiveMatchByUserId(userId);
        if (activeMatchOpt.isPresent()) {
            Match match = activeMatchOpt.get();
            Long otherUserId = match.getUserOneId().equals(userId) ? match.getUserTwoId() : match.getUserOneId();
            User currentUser = userService.findById(userId).orElseThrow();
            User otherUser = userService.findById(otherUserId).orElseThrow();

            String token = liveKitTokenService.generateToken(match.getLivekitRoom(), String.valueOf(currentUser.getId()), currentUser.getDisplayName());
            return Optional.of(new MatchResultDto(
                    match.getId(),
                    token,
                    liveKitTokenService.getLivekitUrl(),
                    match.getLivekitRoom(),
                    otherUser.getId(),
                    otherUser.getDisplayName(),
                    otherUser.getProfilePicture()
            ));
        }

        return Optional.empty();
    }

    public boolean isQueued(Long userId) {
        return userQueueMap.containsKey(userId);
    }

    public int getQueueSize() {
        return queue.size();
    }
}
