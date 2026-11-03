package com.videoplatform.block;

import com.videoplatform.security.AuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/blocks")
public class BlockController {

    private final BlockRepository blockRepository;
    private final AuthContext authContext;

    public BlockController(BlockRepository blockRepository, AuthContext authContext) {
        this.blockRepository = blockRepository;
        this.authContext = authContext;
    }

    @PostMapping
    public ResponseEntity<?> blockUser(@RequestBody Map<String, Object> body,
                                       HttpServletRequest request) {
        Long blockerId = authContext.requireUserId(request);
        Long blockedUserId = ((Number) body.get("blockedUserId")).longValue();

        if (blockerId.equals(blockedUserId)) {
            throw new IllegalArgumentException("Cannot block yourself");
        }

        if (!blockRepository.existsByBlockerIdAndBlockedUserId(blockerId, blockedUserId)) {
            Block block = new Block(blockerId, blockedUserId);
            blockRepository.save(block);
        }

        return ResponseEntity.ok(Map.of("message", "User blocked successfully"));
    }

    @DeleteMapping("/{userId}")
    @Transactional
    public ResponseEntity<?> unblockUser(@PathVariable Long userId,
                                         HttpServletRequest request) {
        Long blockerId = authContext.requireUserId(request);
        blockRepository.deleteByBlockerIdAndBlockedUserId(blockerId, userId);
        return ResponseEntity.ok(Map.of("message", "User unblocked successfully"));
    }
}
