package com.voting.Gp3.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.voting.Gp3.Candidate;
import com.voting.Gp3.Title;
import com.voting.Gp3.repository.TitleRepository;

@Service
public class TitleTableService {
    private final JdbcTemplate jdbcTemplate;
    private final TitleRepository titleRepository;

    public TitleTableService(JdbcTemplate jdbcTemplate, TitleRepository titleRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.titleRepository = titleRepository;
    }

    public String tableName(String titleName) {
        String normalized = titleName == null ? "" : titleName.trim().toLowerCase()
            .replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        return normalized.isBlank() ? "title" : normalized;
    }

    private String quotedTable(Title title) {
        return "`" + tableName(title.getName()) + "`";
    }

    public void createTable(Title title) {
        String table = quotedTable(title);
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + table + " ("
            + "candidate_id BIGINT NOT NULL, "
            + "no INT NOT NULL, "
            + "name VARCHAR(255) NOT NULL, "
            + "student_votes INT NOT NULL DEFAULT 0, "
            + "teacher_votes INT NOT NULL DEFAULT 0, "
            + "PRIMARY KEY (candidate_id), "
            + "CONSTRAINT fk_" + tableName(title.getName()) + "_candidate "
            + "FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE"
            + ") ENGINE=InnoDB");
        addVoteColumnsIfNeeded(title);
    }

    private void addVoteColumnsIfNeeded(Title title) {
        String table = quotedTable(title);
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN student_votes INT NOT NULL DEFAULT 0");
        } catch (org.springframework.dao.DataAccessException ignored) {
            // The column already exists on databases created after this change.
        }
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN teacher_votes INT NOT NULL DEFAULT 0");
        } catch (org.springframework.dao.DataAccessException ignored) {
            // The column already exists on databases created after this change.
        }
    }

    public void dropTable(Title title) {
        jdbcTemplate.execute("DROP TABLE IF EXISTS " + quotedTable(title));
    }

    public void addCandidate(Title title, Candidate candidate) {
        createTable(title);
        jdbcTemplate.update("INSERT INTO " + quotedTable(title) + " (candidate_id, no, name) VALUES (?, ?, ?) "
            + "ON DUPLICATE KEY UPDATE no = VALUES(no), name = VALUES(name)",
            candidate.getId(), candidate.getNo(), candidate.getName());
    }

    public void removeCandidate(Title title, Long candidateId) {
        jdbcTemplate.update("DELETE FROM " + quotedTable(title) + " WHERE candidate_id = ?", candidateId);
    }

    public List<Map<String, Object>> rows(Title title) {
        createTable(title);
        return jdbcTemplate.queryForList(
            "SELECT candidate_id, no, name, student_votes, teacher_votes, (student_votes + teacher_votes) AS votes FROM "
                + quotedTable(title) + " ORDER BY no"
        );
    }

    public Map<String, Integer> getAllVoteTotals() {
        int studentTotal = 0;
        int teacherTotal = 0;

        for (Title title : titleRepository.findAll()) {
            Map<String, Integer> titleTotals = getTitleVoteTotals(title);
            studentTotal += titleTotals.getOrDefault("student", 0);
            teacherTotal += titleTotals.getOrDefault("teacher", 0);
        }

        Map<String, Integer> totals = new HashMap<>();
        totals.put("student", studentTotal);
        totals.put("teacher", teacherTotal);
        totals.put("total", studentTotal + teacherTotal);
        return totals;
    }

    public Map<String, Integer> getTitleVoteTotals(Title title) {
        if (title == null) {
            return Map.of("student", 0, "teacher", 0, "total", 0);
        }

        createTable(title);
        String table = quotedTable(title);
        Integer student = jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(student_votes), 0) FROM " + table,
            Integer.class
        );
        Integer teacher = jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(teacher_votes), 0) FROM " + table,
            Integer.class
        );

        Map<String, Integer> result = new HashMap<>();
        result.put("student", student == null ? 0 : student);
        result.put("teacher", teacher == null ? 0 : teacher);
        result.put("total", result.get("student") + result.get("teacher"));
        return result;
    }

    public int vote(Title title, Long candidateId, String voterType) {
        String voteColumn = switch (voterType) {
            case "student" -> "student_votes";
            case "teacher" -> "teacher_votes";
            default -> throw new IllegalArgumentException("Invalid voter type");
        };
        int updatedRows = jdbcTemplate.update(
            "UPDATE " + quotedTable(title) + " SET " + voteColumn + " = " + voteColumn + " + 1 WHERE candidate_id = ?",
            candidateId
        );
        if (updatedRows == 0) {
            throw new IllegalArgumentException("Candidate is not registered for this title");
        }
        return jdbcTemplate.queryForObject(
            "SELECT " + voteColumn + " FROM " + quotedTable(title) + " WHERE candidate_id = ?",
            Integer.class,
            candidateId
        );
    }

    public void teacherVoteAllCandidates(Title title) {
        createTable(title);
        jdbcTemplate.update("UPDATE " + quotedTable(title) + " SET teacher_votes = teacher_votes + 1");
    }

    public void resetTeacherVotes(Title title) {
        createTable(title);
        jdbcTemplate.update("UPDATE " + quotedTable(title) + " SET teacher_votes = 0");
    }

    public void resetStudentVotes(Title title) {
        createTable(title);
        jdbcTemplate.update("UPDATE " + quotedTable(title) + " SET student_votes = 0");
    }

    public void resetAllTeacherVotes() {
        for (Title title : titleRepository.findAll()) {
            resetTeacherVotes(title);
        }
    }

    public void resetAllStudentVotes() {
        for (Title title : titleRepository.findAll()) {
            resetStudentVotes(title);
        }
    }

    public void resequence(Title title) {
        int number = 1;
        for (Map<String, Object> row : rows(title)) {
            jdbcTemplate.update("UPDATE " + quotedTable(title) + " SET no = ? WHERE candidate_id = ?", number++, row.get("candidate_id"));
        }
    }
}
