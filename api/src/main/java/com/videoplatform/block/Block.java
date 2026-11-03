package com.videoplatform.block;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "blocks")
public class Block {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "blocker_id", nullable = false)
    private Long blockerId;

    @Column(name = "blocked_user_id", nullable = false)
    private Long blockedUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Block() {}

    public Block(Long blockerId, Long blockedUserId) {
        this.blockerId = blockerId;
        this.blockedUserId = blockedUserId;
    }

    public Long getId() { return id; }
    public Long getBlockerId() { return blockerId; }
    public Long getBlockedUserId() { return blockedUserId; }
    public Instant getCreatedAt() { return createdAt; }
}
