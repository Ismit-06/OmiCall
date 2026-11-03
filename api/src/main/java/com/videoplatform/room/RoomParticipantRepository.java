package com.videoplatform.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {

    @Query("SELECT rp FROM RoomParticipant rp WHERE rp.roomId = :roomId AND rp.leftAt IS NULL")
    List<RoomParticipant> findActiveByRoomId(Long roomId);

    @Query("SELECT rp FROM RoomParticipant rp WHERE rp.roomId = :roomId AND rp.userId = :userId AND rp.leftAt IS NULL")
    Optional<RoomParticipant> findActiveByRoomIdAndUserId(Long roomId, Long userId);

    @Query("SELECT COUNT(rp) FROM RoomParticipant rp WHERE rp.roomId = :roomId AND rp.leftAt IS NULL")
    int countActiveByRoomId(Long roomId);

    List<RoomParticipant> findByRoomId(Long roomId);

    @Query("SELECT rp FROM RoomParticipant rp WHERE rp.userId = :userId AND rp.leftAt IS NULL")
    List<RoomParticipant> findActiveByUserId(Long userId);
}
