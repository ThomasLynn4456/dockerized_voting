package com.voting.Gp3.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.Title;

public interface TitleRepository extends JpaRepository<Title, Long> {
    Optional<Title> findByNameIgnoreCase(String name);
}
