package com.videoplatform.report;

import com.videoplatform.security.AuthContext;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportRepository reportRepository;
    private final AuthContext authContext;

    public ReportController(ReportRepository reportRepository, AuthContext authContext) {
        this.reportRepository = reportRepository;
        this.authContext = authContext;
    }

    @PostMapping
    public ResponseEntity<?> submitReport(@RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        Long reporterId = authContext.requireUserId(request);
        Long reportedUserId = ((Number) body.get("reportedUserId")).longValue();
        Long matchId = body.get("matchId") != null ? ((Number) body.get("matchId")).longValue() : null;
        String reason = (String) body.get("reason");

        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Report reason is required");
        }

        Report report = new Report(reporterId, reportedUserId, matchId, reason);
        reportRepository.save(report);

        return ResponseEntity.ok(Map.of("message", "Report submitted successfully"));
    }
}
