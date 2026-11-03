package com.videoplatform.match;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "matches")
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_one_id", nullable = false)
    private Long userOneId;

    @Column(name = "user_two_id", nullable = false)
    private Long userTwoId;

    @Column(name = "livekit_room", nullable = false, unique = true)
    private String livekitRoom;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt = Instant.now();

    @Column(name = "ended_at")
    private Instant endedAt;

    public Match() {}

    public Match(Long userOneId, Long userTwoId, String livekitRoom) {
        this.userOneId = userOneId;
        this.userTwoId = userTwoId;
        this.livekitRoom = livekitRoom;
    }

    public Long getId() { return id; }
    public Long getUserOneId() { return userOneId; }
    public Long getUserTwoId() { return userTwoId; }
    public String getLivekitRoom() { return livekitRoom; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }

    public boolean involvesUser(Long userId) {
        return userOneId.equals(userId) || userTwoId.equals(userId);
    }
}
