package com.voting.Gp3;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "voter")
public class Voter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String major;

    @Column(nullable = false, unique = true)
    private String phoneNumber;

    @Column
    private String telegramChatId;

    @Column
    private String telegramUsername;

    @Column
    private String otpHash;

    @Column
    private java.time.Instant otpExpiresAt;

    @Column
    private java.time.Instant otpRequestedAt;

    @Column(nullable = false)
    private boolean verified = false;

    @Column(nullable = false)
    private boolean hasVoted = false;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "voter_voted_titles", joinColumns = @JoinColumn(name = "voter_id"))
    @Column(name = "title_name")
    private Set<String> votedTitles = new HashSet<>();

    public Voter() {
    }

    public Voter(String username, String major, String phoneNumber) {
        this.username = username;
        this.major = major;
        this.phoneNumber = phoneNumber;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getTelegramChatId() {
        return telegramChatId;
    }

    public void setTelegramChatId(String telegramChatId) {
        this.telegramChatId = telegramChatId;
    }

    public String getTelegramUsername() {
        return telegramUsername;
    }

    public void setTelegramUsername(String telegramUsername) {
        this.telegramUsername = telegramUsername;
    }

    public String getOtpHash() {
        return otpHash;
    }

    public void setOtpHash(String otpHash) {
        this.otpHash = otpHash;
    }

    public java.time.Instant getOtpExpiresAt() {
        return otpExpiresAt;
    }

    public void setOtpExpiresAt(java.time.Instant otpExpiresAt) {
        this.otpExpiresAt = otpExpiresAt;
    }

    public java.time.Instant getOtpRequestedAt() {
        return otpRequestedAt;
    }

    public void setOtpRequestedAt(java.time.Instant otpRequestedAt) {
        this.otpRequestedAt = otpRequestedAt;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public boolean isHasVoted() {
        return hasVoted;
    }

    public void setHasVoted(boolean hasVoted) {
        this.hasVoted = hasVoted;
    }

    public Set<String> getVotedTitles() {
        return votedTitles;
    }

    public void setVotedTitles(Set<String> votedTitles) {
        this.votedTitles = votedTitles == null ? new HashSet<>() : votedTitles;
    }
}
