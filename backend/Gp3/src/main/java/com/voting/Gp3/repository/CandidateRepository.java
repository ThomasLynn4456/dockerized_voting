package com.voting.Gp3.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.Candidate;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    List<Candidate> findByNameAndNoAndGender(String name, Integer no, String gender);
    boolean existsByNoAndGenderIgnoreCase(Integer no, String gender);
    boolean existsByNoAndGenderIgnoreCaseAndIdNot(Integer no, String gender, Long id);
}
