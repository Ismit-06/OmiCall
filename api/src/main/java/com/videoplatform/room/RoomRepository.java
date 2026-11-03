package com.videoplatform.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    Optional<Room> findByRoomCode(String roomCode);

    List<Room> findByHostId(Long hostId);

    List<Room> findByStatus(RoomStatus status);

    @Query("SELECT r FROM Room r WHERE r.status IN ('WAITING', 'ACTIVE', 'FULL')")
    List<Room> findActiveRooms();

    @Query("SELECT r FROM Room r WHERE r.expiresAt < :now AND r.status IN ('WAITING', 'ACTIVE')")
    List<Room> findExpiredRooms(Instant now);

    long countByStatus(RoomStatus status);
}
