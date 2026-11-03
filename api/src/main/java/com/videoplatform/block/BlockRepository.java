package com.videoplatform.block;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BlockRepository extends JpaRepository<Block, Long> {

    boolean existsByBlockerIdAndBlockedUserId(Long blockerId, Long blockedUserId);

    void deleteByBlockerIdAndBlockedUserId(Long blockerId, Long blockedUserId);

    @Query("SELECT b.blockedUserId FROM Block b WHERE b.blockerId = :userId")
    List<Long> findBlockedUserIdsByBlockerId(Long userId);

    @Query("SELECT COUNT(b) > 0 FROM Block b WHERE (b.blockerId = :u1 AND b.blockedUserId = :u2) OR (b.blockerId = :u2 AND b.blockedUserId = :u1)")
    boolean isPairBlocked(Long u1, Long u2);
}
