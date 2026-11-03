package com.videoplatform.room;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "room_participants")
public class RoomParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    @Column(name = "left_at")
    private Instant leftAt;

    public RoomParticipant() {}

    public RoomParticipant(Long roomId, Long userId) {
        this.roomId = roomId;
        this.userId = userId;
    }

    public Long getId() { return id; }
    public Long getRoomId() { return roomId; }
    public Long getUserId() { return userId; }
    public Instant getJoinedAt() { return joinedAt; }
    public Instant getLeftAt() { return leftAt; }
    public void setLeftAt(Instant leftAt) { this.leftAt = leftAt; }

    public boolean isActive() { return leftAt == null; }
}
