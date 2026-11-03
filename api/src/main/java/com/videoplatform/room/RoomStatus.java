package com.videoplatform.room;

public enum RoomStatus {
    WAITING,    // Created, waiting for participants
    ACTIVE,     // Call in progress
    FULL,       // Room is full (2 participants)
    CLOSED,     // Manually closed
    EXPIRED     // Expired due to timeout
}
