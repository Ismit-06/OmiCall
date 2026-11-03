package com.videoplatform.admin;

import com.videoplatform.common.AuditLog;
import com.videoplatform.common.AuditLogRepository;
import com.videoplatform.common.AuditService;
import com.videoplatform.match.Match;
import com.videoplatform.match.MatchRepository;
import com.videoplatform.report.Report;
import com.videoplatform.report.ReportRepository;
import com.videoplatform.room.Room;
import com.videoplatform.room.RoomRepository;
import com.videoplatform.room.RoomService;
import com.videoplatform.security.AuthContext;
import com.videoplatform.user.User;
import com.videoplatform.user.UserRepository;
import com.videoplatform.user.UserStatus;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RoomService roomService;
    private final MatchRepository matchRepository;
    private final ReportRepository reportRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final AuthContext authContext;

    public AdminController(UserRepository userRepository,
                           RoomRepository roomRepository,
                           RoomService roomService,
                           MatchRepository matchRepository,
                           ReportRepository reportRepository,
                           AuditLogRepository auditLogRepository,
                           AuditService auditService,
                           AuthContext authContext) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.roomService = roomService;
        this.matchRepository = matchRepository;
        this.reportRepository = reportRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.authContext = authContext;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats(HttpServletRequest request) {
        authContext.requireAdmin(request);

        return ResponseEntity.ok(Map.of(
                "totalUsers", userRepository.count(),
                "activeUsers", userRepository.countByStatus(UserStatus.ACTIVE),
                "suspendedUsers", userRepository.countByStatus(UserStatus.SUSPENDED),
                "bannedUsers", userRepository.countByStatus(UserStatus.BANNED),
                "activeRooms", roomRepository.findActiveRooms().size(),
                "pendingReports", reportRepository.countByStatus("PENDING"),
                "activeMatches", matchRepository.countByStatus("ACTIVE")
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(@RequestParam(required = false) String search,
                                       HttpServletRequest request) {
        authContext.requireAdmin(request);

        List<User> users = (search != null && !search.isBlank()) ?
                userRepository.searchUsers(search) :
                userRepository.findAll();

        return ResponseEntity.ok(users);
    }

    @PostMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long userId,
                                              @RequestBody Map<String, String> body,
                                              HttpServletRequest request) {
        Long adminId = authContext.requireAdmin(request);
        String statusStr = body.get("status");
        String reason = body.get("reason");

        UserStatus newStatus = UserStatus.valueOf(statusStr.toUpperCase());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setStatus(newStatus);
        userRepository.save(user);

        auditService.log(adminId, "UPDATE_USER_STATUS", "USER", String.valueOf(userId),
                reason != null ? reason : "Status changed to " + newStatus, request);

        return ResponseEntity.ok(Map.of("message", "User status updated to " + newStatus));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> listReports(@RequestParam(required = false, defaultValue = "PENDING") String status,
                                         HttpServletRequest request) {
        authContext.requireAdmin(request);
        return ResponseEntity.ok(reportRepository.findByStatusOrderByCreatedAtDesc(status));
    }

    @PostMapping("/reports/{reportId}/resolve")
    public ResponseEntity<?> resolveReport(@PathVariable Long reportId,
                                           @RequestBody Map<String, String> body,
                                           HttpServletRequest request) {
        Long adminId = authContext.requireAdmin(request);
        String action = body.get("action"); // RESOLVED or DISMISSED
        String notes = body.get("notes");

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

        report.setStatus(action != null ? action.toUpperCase() : "RESOLVED");
        report.setModeratorNotes(notes);
        reportRepository.save(report);

        auditService.log(adminId, "RESOLVE_REPORT", "REPORT", String.valueOf(reportId),
                notes, request);

        return ResponseEntity.ok(Map.of("message", "Report updated successfully"));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<?> listAuditLogs(HttpServletRequest request) {
        authContext.requireAdmin(request);
        return ResponseEntity.ok(auditLogRepository.findTop50ByOrderByCreatedAtDesc());
    }

    @PostMapping("/rooms/{roomId}/terminate")
    public ResponseEntity<?> terminateRoom(@PathVariable Long roomId,
                                           @RequestBody(required = false) Map<String, String> body,
                                           HttpServletRequest request) {
        Long adminId = authContext.requireAdmin(request);
        String reason = body != null ? body.get("reason") : "Terminated by admin";

        roomService.closeRoom(roomId);

        auditService.log(adminId, "TERMINATE_ROOM", "ROOM", String.valueOf(roomId),
                reason, request);

        return ResponseEntity.ok(Map.of("message", "Room terminated successfully"));
    }
}
