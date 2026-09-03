package com.voting.Gp3.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.Title;
import com.voting.Gp3.entity.PublishedTitleResult;

public interface PublishedTitleResultRepository extends JpaRepository<PublishedTitleResult, Long> {
    List<PublishedTitleResult> findAllByOrderByPublishedAtDesc();
    Optional<PublishedTitleResult> findByTitle(Title title);
    void deleteByTitle(Title title);
}
