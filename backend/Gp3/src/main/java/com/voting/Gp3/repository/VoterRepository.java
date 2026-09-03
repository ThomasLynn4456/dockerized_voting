package com.voting.Gp3.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.voting.Gp3.Voter;

import jakarta.persistence.LockModeType;

public interface VoterRepository extends JpaRepository<Voter, Long> {
	Optional<Voter> findByPhoneNumber(String phoneNumber);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select v from Voter v where v.id = :id")
	Optional<Voter> findByIdForUpdate(@Param("id") Long id);
}