package com.videoplatform.report;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    List<Report> findByStatusOrderByCreatedAtDesc(String status);

    List<Report> findByReportedUserIdOrderByCreatedAtDesc(Long reportedUserId);

    long countByStatus(String status);
}
