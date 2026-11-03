package com.videoplatform.common;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByAdminIdOrderByCreatedAtDesc(Long adminId);

    List<AuditLog> findByActionOrderByCreatedAtDesc(String action);

    List<AuditLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, String targetId);

    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant start, Instant end);

    List<AuditLog> findTop50ByOrderByCreatedAtDesc();
}
