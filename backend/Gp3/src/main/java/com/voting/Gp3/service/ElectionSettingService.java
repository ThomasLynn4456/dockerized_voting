package com.voting.Gp3.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.voting.Gp3.entity.ElectionSetting;
import com.voting.Gp3.repository.ElectionSettingRepository;

@Service
public class ElectionSettingService {

    private final ElectionSettingRepository repository;

    public ElectionSettingService(ElectionSettingRepository repository) {
        this.repository = repository;
    }

    public ElectionSetting getSetting() {
        return repository.findAll().stream().findFirst().orElseGet(() -> {
            ElectionSetting setting = new ElectionSetting();
            return repository.save(setting);
        });
    }

    public boolean isVotingClosed() {
        ElectionSetting setting = getSetting();
        if (setting.isVotingClosed()) {
            return true;
        }
        Instant deadline = setting.getVotingDeadline();
        return deadline != null && Instant.now().isAfter(deadline);
    }

    @Transactional
    public ElectionSetting updateSetting(Instant deadline, Boolean votingClosed) {
        ElectionSetting setting = getSetting();
        setting.setVotingDeadline(deadline);
        if (votingClosed != null) {
            setting.setVotingClosed(votingClosed);
        } else if (deadline != null && Instant.now().isBefore(deadline)) {
            setting.setVotingClosed(false);
        }
        return repository.save(setting);
    }

    @Transactional
    public ElectionSetting clearDeadline() {
        ElectionSetting setting = getSetting();
        setting.setVotingDeadline(null);
        setting.setVotingClosed(false);
        return repository.save(setting);
    }
}
