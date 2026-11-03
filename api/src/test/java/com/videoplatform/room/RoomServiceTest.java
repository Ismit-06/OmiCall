package com.videoplatform.room;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("dev")
@Transactional
class RoomServiceTest {

    @Autowired
    private RoomService roomService;

    @Test
    void createRoom_generatesCodeAndAssignsHost() {
        Room room = roomService.createRoom(100L, null);

        assertNotNull(room.getId());
        assertNotNull(room.getRoomCode());
        assertEquals(10, room.getRoomCode().length());
        assertEquals(100L, room.getHostId());
        assertFalse(room.hasPassword());
        assertEquals(1, roomService.getActiveParticipantCount(room.getId()));
    }

    @Test
    void joinRoom_withPassword_succeedsWhenCorrect() {
        Room room = roomService.createRoom(101L, "secret123");
        assertTrue(room.hasPassword());

        Room joined = roomService.joinRoom(room.getRoomCode(), 102L, "secret123");
        assertNotNull(joined);
        assertEquals(2, roomService.getActiveParticipantCount(room.getId()));
        assertEquals(RoomStatus.FULL, joined.getStatus());
    }

    @Test
    void joinRoom_withWrongPassword_fails() {
        Room room = roomService.createRoom(103L, "secret123");

        assertThrows(SecurityException.class, () -> {
            roomService.joinRoom(room.getRoomCode(), 104L, "wrongpass");
        });
    }

    @Test
    void joinRoom_rejectsThirdParticipant_capacityEnforced() {
        Room room = roomService.createRoom(105L, null);
        roomService.joinRoom(room.getRoomCode(), 106L, null);

        // Attempt 3rd participant
        assertThrows(IllegalStateException.class, () -> {
            roomService.joinRoom(room.getRoomCode(), 107L, null);
        });
    }

    @Test
    void leaveRoom_updatesParticipantCount() {
        Room room = roomService.createRoom(108L, null);
        roomService.joinRoom(room.getRoomCode(), 109L, null);
        assertEquals(2, roomService.getActiveParticipantCount(room.getId()));

        roomService.leaveRoom(room.getRoomCode(), 109L);
        assertEquals(1, roomService.getActiveParticipantCount(room.getId()));
    }
}
