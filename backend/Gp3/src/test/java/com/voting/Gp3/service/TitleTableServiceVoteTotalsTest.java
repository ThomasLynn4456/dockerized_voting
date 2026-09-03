package com.voting.Gp3.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import com.voting.Gp3.Candidate;
import com.voting.Gp3.Title;
import com.voting.Gp3.repository.TitleRepository;

@SpringBootTest
@ActiveProfiles("test")
class TitleTableServiceVoteTotalsTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private TitleTableService titleTableService;

    @Autowired
    private TitleRepository titleRepository;

    @Test
    void shouldAggregateStudentAndTeacherVoteTotalsAcrossAllTitleTables() {
        Title title = new Title();
        title.setName("King");
        title.setGender("Male");
        title = titleRepository.save(title);

        Candidate candidateOne = new Candidate();
        candidateOne.setId(101L);
        candidateOne.setNo(1);
        candidateOne.setName("Alpha");
        candidateOne.setGender("Male");

        Candidate candidateTwo = new Candidate();
        candidateTwo.setId(102L);
        candidateTwo.setNo(2);
        candidateTwo.setName("Bravo");
        candidateTwo.setGender("Male");

        jdbcTemplate.update("INSERT INTO candidates (id, no, name, gender) VALUES (?, ?, ?, ?)", candidateOne.getId(), candidateOne.getNo(), candidateOne.getName(), candidateOne.getGender());
        jdbcTemplate.update("INSERT INTO candidates (id, no, name, gender) VALUES (?, ?, ?, ?)", candidateTwo.getId(), candidateTwo.getNo(), candidateTwo.getName(), candidateTwo.getGender());

        titleTableService.createTable(title);
        titleTableService.addCandidate(title, candidateOne);
        titleTableService.addCandidate(title, candidateTwo);

        titleTableService.vote(title, candidateOne.getId(), "student");
        titleTableService.vote(title, candidateOne.getId(), "student");
        titleTableService.vote(title, candidateTwo.getId(), "teacher");

        Map<String, Integer> totals = titleTableService.getAllVoteTotals();

        assertNotNull(totals);
        assertEquals(2, totals.get("student"));
        assertEquals(1, totals.get("teacher"));
        assertEquals(3, totals.get("total"));
    }
}
