package com.voting.Gp3.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.voting.Gp3.entity.TeacherVoteToken;
import com.voting.Gp3.repository.TeacherVoteTokenRepository;

@Service
public class TeacherVoteTokenService {

    private final TeacherVoteTokenRepository teacherVoteTokenRepository;

    public TeacherVoteTokenService(TeacherVoteTokenRepository teacherVoteTokenRepository) {
        this.teacherVoteTokenRepository = teacherVoteTokenRepository;
    }

    @Transactional
    public TeacherVoteToken createToken(String teacherName) {
        String token = UUID.randomUUID().toString();
        Instant now = Instant.now();
        TeacherVoteToken entity = new TeacherVoteToken(
                token,
                now,
                now.plusSeconds(900),
                "admin",
                teacherName
        );
        return teacherVoteTokenRepository.save(entity);
    }

    public List<TeacherVoteToken> findAll() {
        return teacherVoteTokenRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<TeacherVoteToken> findAllActive() {
        List<TeacherVoteToken> tokens = findAll();
        Instant now = Instant.now();
        List<TeacherVoteToken> active = new ArrayList<>();
        for (TeacherVoteToken token : tokens) {
            if (token.isActive() && token.getExpiresAt().isAfter(now)) {
                active.add(token);
            }
        }
        return active;
    }

    public java.util.Optional<TeacherVoteToken> findByToken(String token) {
        return teacherVoteTokenRepository.findByToken(token);
    }

    public Instant getExpiry(String token) {
        return teacherVoteTokenRepository.findByToken(token)
                .map(TeacherVoteToken::getExpiresAt)
                .orElse(Instant.now());
    }

    public boolean isValid(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        return teacherVoteTokenRepository.findByToken(token)
                .map(record -> record.isActive() && record.getExpiresAt().isAfter(Instant.now()))
                .orElse(false);
    }

    @Transactional
    public void markVote(String token, String titleKey) {
        // mark a title-level vote (used for "vote all candidates in a title")
        if (!isValid(token) || titleKey == null || titleKey.isBlank()) {
            return;
        }

        TeacherVoteToken record = teacherVoteTokenRepository.findByToken(token).orElse(null);
        if (record == null) {
            return;
        }

        String normalizedKey = titleKey.trim().toLowerCase(Locale.ROOT);
        if (record.getTeacherName() == null || record.getTeacherName().isBlank()) {
            record.setTeacherName(normalizedKey);
        }

        // append entry for title (indicates token voted for all candidates in this title)
        String entry = normalizedKey;
        addVoteEntry(record, entry);

        teacherVoteTokenRepository.save(record);
    }

    @Transactional
    public void markVoteForCandidate(String token, String titleKey, Long candidateId) {
        if (!isValid(token) || titleKey == null || titleKey.isBlank() || candidateId == null) {
            return;
        }

        TeacherVoteToken record = teacherVoteTokenRepository.findByToken(token).orElse(null);
        if (record == null) {
            return;
        }

        String normalizedKey = titleKey.trim().toLowerCase(Locale.ROOT);
        String entry = normalizedKey + ":" + candidateId;
        addVoteEntry(record, entry);

        teacherVoteTokenRepository.save(record);
    }

    public boolean hasVotedForCandidate(String token, String titleKey, Long candidateId) {
        if (!isValid(token)) {
            return true;
        }
        if (titleKey == null || titleKey.isBlank() || candidateId == null) {
            return true;
        }

        TeacherVoteToken record = teacherVoteTokenRepository.findByToken(token).orElse(null);
        if (record == null) {
            return true;
        }

        String normalizedKey = titleKey.trim().toLowerCase(Locale.ROOT);
        String candidateEntry = normalizedKey + ":" + candidateId;
        // if token has a title-level entry, treat as already voted for all candidates in the title
        Set<String> entries = getVoteEntries(record);
        return entries.contains(normalizedKey) || entries.contains(candidateEntry);
    }

    public Set<String> getVotedTitles(String token) {
        if (!isValid(token)) {
            return new HashSet<>();
        }

        TeacherVoteToken record = teacherVoteTokenRepository.findByToken(token).orElse(null);
        if (record == null || record.getVotedEntries() == null || record.getVotedEntries().isBlank()) {
            return Collections.emptySet();
        }

        Set<String> titles = new HashSet<>();
        for (String entry : getVoteEntries(record)) {
            String key = entry.toLowerCase(Locale.ROOT);
            if (key.contains(":")) {
                key = key.substring(0, key.indexOf(":"));
            }
            titles.add(key);
        }

        return titles;
    }

    @Transactional
    public void deleteToken(Long id) {
        teacherVoteTokenRepository.deleteById(id);
    }

    private void addVoteEntry(TeacherVoteToken record, String entry) {
        Set<String> entries = getVoteEntries(record);
        if (entries.add(entry)) {
            record.setVotedEntries(String.join(",", entries));
        }
    }

    private Set<String> getVoteEntries(TeacherVoteToken record) {
        String storedEntries = record.getVotedEntries();
        if (storedEntries == null || storedEntries.isBlank()) {
            return new LinkedHashSet<>();
        }

        Set<String> entries = new LinkedHashSet<>();
        for (String entry : storedEntries.split(",")) {
            if (entry != null && !entry.isBlank()) {
                entries.add(entry.trim().toLowerCase(Locale.ROOT));
            }
        }
        return entries;
    }
}
