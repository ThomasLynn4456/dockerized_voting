package com.voting.Gp3.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.voting.Gp3.entity.ElectionSetting;

public interface ElectionSettingRepository extends JpaRepository<ElectionSetting, Long> {
}
