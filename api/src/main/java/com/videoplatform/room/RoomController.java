package com.videoplatform.room;

import com.videoplatform.security.AuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;
    private final AuthContext authContext;

    public RoomController(RoomService roomService, AuthContext authContext) {
        this.roomService = roomService;
        this.authContext = authContext;
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody(required = false) Map<String, String> body,
                                        HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        String password = body != null ? body.get("password") : null;
        Room room = roomService.createRoom(userId, password);
        int count = roomService.getActiveParticipantCount(room.getId());
        return ResponseEntity.ok(RoomDto.fromEntity(room, count));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyRooms(HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        return ResponseEntity.ok(roomService.getRoomsByHost(userId));
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<?> getRoom(@PathVariable String roomCode) {
        Room room = roomService.getRoomByCode(roomCode);
        int count = roomService.getActiveParticipantCount(room.getId());
        return ResponseEntity.ok(RoomDto.fromEntity(room, count));
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomCode,
                                      @RequestBody(required = false) Map<String, String> body,
                                      HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        String password = body != null ? body.get("password") : null;
        Room room = roomService.joinRoom(roomCode, userId, password);
        int count = roomService.getActiveParticipantCount(room.getId());
        return ResponseEntity.ok(RoomDto.fromEntity(room, count));
    }

    @PostMapping("/{roomCode}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable String roomCode,
                                       HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        roomService.leaveRoom(roomCode, userId);
        return ResponseEntity.ok(Map.of("message", "Left room successfully"));
    }
}
