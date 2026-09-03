package com.voting.Gp3.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.Admin;

public interface AdminRepository extends JpaRepository<Admin, Long> {

    Optional<Admin> findByEmail(String email);

    Optional<Admin> findByEmailIgnoreCase(String email);

    Optional<Admin> findFirstByNameIgnoreCase(String name);

    boolean existsByEmail(String email);
}
