package com.videoplatform.match;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    @Query("SELECT m FROM Match m WHERE (m.userOneId = :userId OR m.userTwoId = :userId) AND m.status = 'ACTIVE'")
    Optional<Match> findActiveMatchByUserId(Long userId);

    List<Match> findByStatusOrderByStartedAtDesc(String status);

    long countByStatus(String status);
}
