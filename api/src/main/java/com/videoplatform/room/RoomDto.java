package com.videoplatform.room;

import java.time.Instant;

public class RoomDto {
    private Long id;
    private String roomCode;
    private Long hostId;
    private boolean hasPassword;
    private String status;
    private int maxParticipants;
    private int participantCount;
    private Instant createdAt;
    private Instant expiresAt;

    public RoomDto() {}

    public static RoomDto fromEntity(Room room, int participantCount) {
        RoomDto dto = new RoomDto();
        dto.setId(room.getId());
        dto.setRoomCode(room.getRoomCode());
        dto.setHostId(room.getHostId());
        dto.setHasPassword(room.hasPassword());
        dto.setStatus(room.getStatus().name());
        dto.setMaxParticipants(room.getMaxParticipants());
        dto.setParticipantCount(participantCount);
        dto.setCreatedAt(room.getCreatedAt());
        dto.setExpiresAt(room.getExpiresAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
    public Long getHostId() { return hostId; }
    public void setHostId(Long hostId) { this.hostId = hostId; }
    public boolean isHasPassword() { return hasPassword; }
    public void setHasPassword(boolean hasPassword) { this.hasPassword = hasPassword; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getMaxParticipants() { return maxParticipants; }
    public void setMaxParticipants(int maxParticipants) { this.maxParticipants = maxParticipants; }
    public int getParticipantCount() { return participantCount; }
    public void setParticipantCount(int participantCount) { this.participantCount = participantCount; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
