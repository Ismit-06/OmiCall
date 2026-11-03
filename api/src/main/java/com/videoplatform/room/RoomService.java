package com.videoplatform.room;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class RoomService {

    private static final int ROOM_CODE_LENGTH = 10;
    private static final long ROOM_TTL_HOURS = 24;
    private static final String CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom;

    public RoomService(RoomRepository roomRepository, RoomParticipantRepository participantRepository) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
        this.secureRandom = new SecureRandom();
    }

    /**
     * Creates a private room with a cryptographically secure, non-enumerable room code.
     */
    @Transactional
    public Room createRoom(Long hostId, String password) {
        Room room = new Room();
        room.setRoomCode(generateSecureRoomCode());
        room.setHostId(hostId);
        room.setExpiresAt(Instant.now().plus(ROOM_TTL_HOURS, ChronoUnit.HOURS));

        if (password != null && !password.isBlank()) {
            room.setPasswordHash(passwordEncoder.encode(password));
        }

        room = roomRepository.save(room);

        // Host auto-joins the room
        RoomParticipant hostParticipant = new RoomParticipant(room.getId(), hostId);
        participantRepository.save(hostParticipant);

        return room;
    }

    /**
     * Joins a room after validating password, capacity, and room state.
     */
    @Transactional
    public Room joinRoom(String roomCode, Long userId, String password) {
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        // Check if user is already in the room
        if (participantRepository.findActiveByRoomIdAndUserId(room.getId(), userId).isPresent()) {
            return room; // Already joined
        }

        if (room.isExpired()) {
            room.setStatus(RoomStatus.EXPIRED);
            roomRepository.save(room);
            throw new IllegalStateException("Room has expired");
        }

        if (!room.isJoinable()) {
            throw new IllegalStateException("Room is not joinable (status: " + room.getStatus() + ")");
        }

        // Verify password
        if (room.hasPassword()) {
            if (password == null || !passwordEncoder.matches(password, room.getPasswordHash())) {
                throw new SecurityException("Invalid room password");
            }
        }

        // Enforce capacity — strict server-side check
        int activeCount = participantRepository.countActiveByRoomId(room.getId());
        if (activeCount >= room.getMaxParticipants()) {
            room.setStatus(RoomStatus.FULL);
            roomRepository.save(room);
            throw new IllegalStateException("Room is full");
        }

        // Join
        RoomParticipant participant = new RoomParticipant(room.getId(), userId);
        participantRepository.save(participant);

        activeCount++;
        if (activeCount >= room.getMaxParticipants()) {
            room.setStatus(RoomStatus.FULL);
        } else {
            room.setStatus(RoomStatus.ACTIVE);
        }
        roomRepository.save(room);

        return room;
    }

    @Transactional
    public void leaveRoom(String roomCode, Long userId) {
        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));

        participantRepository.findActiveByRoomIdAndUserId(room.getId(), userId).ifPresent(p -> {
            p.setLeftAt(Instant.now());
            participantRepository.save(p);
        });

        int remaining = participantRepository.countActiveByRoomId(room.getId());
        if (remaining == 0) {
            room.setStatus(RoomStatus.CLOSED);
        } else if (room.getStatus() == RoomStatus.FULL) {
            room.setStatus(RoomStatus.ACTIVE);
        }
        roomRepository.save(room);
    }

    public Room getRoomByCode(String roomCode) {
        return roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
    }

    public List<RoomDto> getRoomsByHost(Long hostId) {
        return roomRepository.findByHostId(hostId).stream()
                .filter(r -> r.getStatus() != RoomStatus.CLOSED && r.getStatus() != RoomStatus.EXPIRED)
                .map(r -> RoomDto.fromEntity(r, getActiveParticipantCount(r.getId())))
                .toList();
    }

    public List<RoomParticipant> getActiveParticipants(Long roomId) {
        return participantRepository.findActiveByRoomId(roomId);
    }

    public int getActiveParticipantCount(Long roomId) {
        return participantRepository.countActiveByRoomId(roomId);
    }

    public List<Room> getActiveRooms() {
        return roomRepository.findActiveRooms();
    }

    @Transactional
    public void closeRoom(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room not found"));
        room.setStatus(RoomStatus.CLOSED);
        roomRepository.save(room);

        // Remove all active participants
        participantRepository.findActiveByRoomId(roomId).forEach(p -> {
            p.setLeftAt(Instant.now());
            participantRepository.save(p);
        });
    }

    @Transactional
    public void expireStaleRooms() {
        List<Room> expired = roomRepository.findExpiredRooms(Instant.now());
        for (Room room : expired) {
            room.setStatus(RoomStatus.EXPIRED);
            roomRepository.save(room);
            participantRepository.findActiveByRoomId(room.getId()).forEach(p -> {
                p.setLeftAt(Instant.now());
                participantRepository.save(p);
            });
        }
    }

    private String generateSecureRoomCode() {
        StringBuilder sb = new StringBuilder(ROOM_CODE_LENGTH);
        for (int i = 0; i < ROOM_CODE_LENGTH; i++) {
            sb.append(CODE_CHARS.charAt(secureRandom.nextInt(CODE_CHARS.length())));
        }
        return sb.toString();
    }
}
