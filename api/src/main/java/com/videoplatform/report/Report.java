package com.videoplatform.report;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "reports")
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Column(name = "reported_user_id", nullable = false)
    private Long reportedUserId;

    @Column(name = "match_id")
    private Long matchId;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(name = "moderator_notes")
    private String moderatorNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Report() {}

    public Report(Long reporterId, Long reportedUserId, Long matchId, String reason) {
        this.reporterId = reporterId;
        this.reportedUserId = reportedUserId;
        this.matchId = matchId;
        this.reason = reason;
    }

    public Long getId() { return id; }
    public Long getReporterId() { return reporterId; }
    public Long getReportedUserId() { return reportedUserId; }
    public Long getMatchId() { return matchId; }
    public String getReason() { return reason; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getModeratorNotes() { return moderatorNotes; }
    public void setModeratorNotes(String moderatorNotes) { this.moderatorNotes = moderatorNotes; }
    public Instant getCreatedAt() { return createdAt; }
}
