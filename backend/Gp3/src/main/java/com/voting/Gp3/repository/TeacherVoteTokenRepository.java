package com.voting.Gp3.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.entity.TeacherVoteToken;

public interface TeacherVoteTokenRepository extends JpaRepository<TeacherVoteToken, Long> {
    Optional<TeacherVoteToken> findByToken(String token);
    List<TeacherVoteToken> findAllByOrderByCreatedAtDesc();
    List<TeacherVoteToken> findByExpiresAtBefore(Instant now);
}
