package com.videoplatform.match;

import com.videoplatform.security.AuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/match")
public class MatchController {

    private final MatchService matchService;
    private final AuthContext authContext;

    public MatchController(MatchService matchService, AuthContext authContext) {
        this.matchService = matchService;
        this.authContext = authContext;
    }

    @PostMapping("/start")
    public ResponseEntity<?> startMatch(@RequestBody(required = false) Map<String, Object> body,
                                        HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);

        List<String> interests = body != null && body.get("interests") instanceof List ?
                (List<String>) body.get("interests") : null;
        String language = body != null ? (String) body.get("language") : null;
        String country = body != null ? (String) body.get("country") : null;
        String preferredGender = body != null ? (String) body.get("preferredGender") : null;

        Optional<MatchResultDto> result = matchService.enterQueue(userId, interests, language, country, preferredGender);

        if (result.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "status", "MATCHED",
                    "match", result.get()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", "SEARCHING",
                "queueSize", matchService.getQueueSize()
        ));
    }

    @PostMapping("/cancel")
    public ResponseEntity<?> cancelMatch(HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        matchService.leaveQueue(userId);
        matchService.cancelActiveMatch(userId);
        return ResponseEntity.ok(Map.of("message", "Cancelled matchmaking successfully"));
    }

    @GetMapping("/status")
    public ResponseEntity<?> getMatchStatus(HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        Optional<MatchResultDto> result = matchService.getStatus(userId);

        if (result.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "status", "MATCHED",
                    "match", result.get()
            ));
        }

        if (matchService.isQueued(userId)) {
            return ResponseEntity.ok(Map.of(
                    "status", "SEARCHING",
                    "queueSize", matchService.getQueueSize()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "status", "IDLE"
        ));
    }

    @PostMapping("/next")
    public ResponseEntity<?> nextMatch(@RequestBody(required = false) Map<String, Object> body,
                                       HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        matchService.cancelActiveMatch(userId);
        return startMatch(body, request);
    }
}
