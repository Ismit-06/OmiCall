package com.videoplatform.common;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Append-only audit log for all administrative actions.
 * Records are never deleted or modified.
 */
@Entity
@Table(name = "admin_audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(nullable = false)
    private String action;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private String targetId;

    private String reason;

    private String details;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AuditLog() {}

    public AuditLog(Long adminId, String action, String targetType, String targetId, String reason, String ipAddress) {
        this.adminId = adminId;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reason = reason;
        this.ipAddress = ipAddress;
    }

    // Getters only — immutable after creation
    public Long getId() { return id; }
    public Long getAdminId() { return adminId; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public String getTargetId() { return targetId; }
    public String getReason() { return reason; }
    public String getDetails() { return details; }
    public String getIpAddress() { return ipAddress; }
    public Instant getCreatedAt() { return createdAt; }

    public void setDetails(String details) { this.details = details; }
}
