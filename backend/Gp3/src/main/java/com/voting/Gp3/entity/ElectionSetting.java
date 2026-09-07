package com.voting.Gp3.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "election_settings")
public class ElectionSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "voting_deadline")
    private Instant votingDeadline;

    @Column(name = "voting_closed", nullable = false)
    private boolean votingClosed = false;

    public ElectionSetting() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Instant getVotingDeadline() {
        return votingDeadline;
    }

    public void setVotingDeadline(Instant votingDeadline) {
        this.votingDeadline = votingDeadline;
    }

    public boolean isVotingClosed() {
        return votingClosed;
    }

    public void setVotingClosed(boolean votingClosed) {
        this.votingClosed = votingClosed;
    }
}
