package com.videoplatform.room;

import com.videoplatform.user.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_code", nullable = false, unique = true)
    private String roomCode;

    @Column(name = "host_id", nullable = false)
    private Long hostId;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RoomStatus status = RoomStatus.WAITING;

    @Column(name = "max_participants", nullable = false)
    private int maxParticipants = 2;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public Room() {}

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public Long getHostId() { return hostId; }
    public void setHostId(Long hostId) { this.hostId = hostId; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public RoomStatus getStatus() { return status; }
    public void setStatus(RoomStatus status) { this.status = status; }

    public int getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(int maxParticipants) { this.maxParticipants = maxParticipants; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public boolean hasPassword() { return passwordHash != null && !passwordHash.isBlank(); }
    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }
    public boolean isJoinable() {
        return (status == RoomStatus.WAITING || status == RoomStatus.ACTIVE) && !isExpired();
    }
}
