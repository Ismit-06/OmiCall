package com.videoplatform.call;

import com.videoplatform.room.Room;
import com.videoplatform.room.RoomParticipantRepository;
import com.videoplatform.room.RoomService;
import com.videoplatform.security.AuthContext;
import com.videoplatform.user.User;
import com.videoplatform.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/calls")
public class CallController {

    private final LiveKitTokenService tokenService;
    private final RoomService roomService;
    private final UserService userService;
    private final AuthContext authContext;
    private final RoomParticipantRepository participantRepository;

    public CallController(LiveKitTokenService tokenService,
                          RoomService roomService,
                          UserService userService,
                          AuthContext authContext,
                          RoomParticipantRepository participantRepository) {
        this.tokenService = tokenService;
        this.roomService = roomService;
        this.userService = userService;
        this.authContext = authContext;
        this.participantRepository = participantRepository;
    }

    /**
     * Mints a LiveKit token for an authorized room participant.
     * Prevents non-participants from obtaining a token.
     */
    @GetMapping("/token/room/{roomCode}")
    public ResponseEntity<?> getRoomToken(@PathVariable String roomCode,
                                          HttpServletRequest request) {
        Long userId = authContext.requireUserId(request);
        User user = userService.findById(userId)
                .orElseThrow(() -> new SecurityException("User not found"));

        Room room = roomService.getRoomByCode(roomCode);

        // Security check: Verify user is an active participant in this room
        boolean isParticipant = participantRepository.findActiveByRoomIdAndUserId(room.getId(), userId).isPresent();
        if (!isParticipant) {
            throw new SecurityException("User is not an active participant in room " + roomCode);
        }

        String token = tokenService.generateToken(
                room.getRoomCode(),
                String.valueOf(user.getId()),
                user.getDisplayName()
        );

        return ResponseEntity.ok(Map.of(
                "token", token,
                "livekitUrl", tokenService.getLivekitUrl(),
                "roomCode", room.getRoomCode()
        ));
    }
}
