package com.voting.Gp3.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.Candidate;
import com.voting.Gp3.Title;
import com.voting.Gp3.TitleCandidate;

public interface TitleCandidateRepository extends JpaRepository<TitleCandidate, Long> {
    List<TitleCandidate> findByTitle(Title title);
    List<TitleCandidate> findByCandidate(Candidate candidate);
    Optional<TitleCandidate> findByTitleAndCandidate(Title title, Candidate candidate);
    void deleteByTitle(Title title);
}
