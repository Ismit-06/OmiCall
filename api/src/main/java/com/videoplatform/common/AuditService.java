package com.videoplatform.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Record an administrative action. Never logs sensitive data (passwords, tokens, keys).
     */
    public AuditLog log(Long adminId, String action, String targetType, String targetId,
                        String reason, HttpServletRequest request) {
        String ip = getClientIp(request);
        AuditLog entry = new AuditLog(adminId, action, targetType, targetId, reason, ip);
        return auditLogRepository.save(entry);
    }

    public AuditLog logWithDetails(Long adminId, String action, String targetType, String targetId,
                                    String reason, String details, HttpServletRequest request) {
        String ip = getClientIp(request);
        AuditLog entry = new AuditLog(adminId, action, targetType, targetId, reason, ip);
        entry.setDetails(details);
        return auditLogRepository.save(entry);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
