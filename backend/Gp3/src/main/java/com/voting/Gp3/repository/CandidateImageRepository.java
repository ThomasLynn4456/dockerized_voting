package com.voting.Gp3.repository;

import java.util.List;
import com.voting.Gp3.Candidate;
import com.voting.Gp3.entity.CandidateImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateImageRepository extends JpaRepository<CandidateImage, Long> {
    List<CandidateImage> findAllByCandidateOrderByDisplayOrderAscIdAsc(Candidate candidate);
}
