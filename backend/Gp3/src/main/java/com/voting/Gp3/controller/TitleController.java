package com.voting.Gp3.controller;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.voting.Gp3.Candidate;
import com.voting.Gp3.Title;
import com.voting.Gp3.TitleCandidate;
import com.voting.Gp3.Voter;
import com.voting.Gp3.repository.CandidateRepository;
import com.voting.Gp3.repository.TitleCandidateRepository;
import com.voting.Gp3.repository.TitleRepository;
import com.voting.Gp3.repository.VoterRepository;
import com.voting.Gp3.service.TeacherVoteTokenService;
import com.voting.Gp3.service.TitleTableService;
import com.voting.Gp3.entity.PublishedTitleResult;
import com.voting.Gp3.repository.PublishedTitleResultRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/titles")
public class TitleController {

    private final TitleRepository titleRepository;
    private final CandidateRepository candidateRepository;
    private final TitleCandidateRepository titleCandidateRepository;
    private final TitleTableService titleTableService;
    private final VoterRepository voterRepository;
    private final TeacherVoteTokenService teacherVoteTokenService;
    private final PublishedTitleResultRepository publishedTitleResultRepository;

    public TitleController(
            TitleRepository titleRepository,
            CandidateRepository candidateRepository,
            TitleCandidateRepository titleCandidateRepository,
            TitleTableService titleTableService,
            VoterRepository voterRepository,
            TeacherVoteTokenService teacherVoteTokenService,
            PublishedTitleResultRepository publishedTitleResultRepository
    ) {
        this.titleRepository = titleRepository;
        this.candidateRepository = candidateRepository;
        this.titleCandidateRepository = titleCandidateRepository;
        this.titleTableService = titleTableService;
        this.voterRepository = voterRepository;
        this.teacherVoteTokenService = teacherVoteTokenService;
        this.publishedTitleResultRepository = publishedTitleResultRepository;
    }

    // Get all titles
    @GetMapping
    public List<Title> getTitles() {
        return titleRepository.findAll();
    }

    @GetMapping("/summary")
    public Map<String, Integer> getVoteSummary() {
        return titleTableService.getAllVoteTotals();
    }

    @GetMapping("/totals")
    public Map<String, Map<String, Integer>> getTitleVoteTotals() {
        java.util.LinkedHashMap<String, Map<String, Integer>> totals = new java.util.LinkedHashMap<>();
        for (Title title : titleRepository.findAll()) {
            totals.put(title.getName(), titleTableService.getTitleVoteTotals(title));
        }
        return totals;
    }

    // Create new title
    @PostMapping
    @Transactional
    public ResponseEntity<?> createTitle(@RequestBody Title title) {

        if (title.getName() == null || title.getName().isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body("Title name is required.");
        }

        String titleName = title.getName().trim();

        if (titleRepository.findByNameIgnoreCase(titleName).isPresent()) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("That title already exists.");
        }

        title.setName(titleName);

        if (title.getGender() == null || title.getGender().isBlank()) {
            title.setGender("Male");
        } else {
            title.setGender(title.getGender().trim());
        }

        Title savedTitle = titleRepository.save(title);

        // Create separate table for this title if service exists
        if (titleTableService != null) {
            titleTableService.createTable(savedTitle);
        }

        // Add matching candidates
        for (Candidate candidate : candidateRepository.findAll()) {

            if (candidate.getGender() != null
                    && savedTitle.getGender()
                            .equalsIgnoreCase(candidate.getGender())) {

                if (titleTableService != null) {
                    titleTableService.addCandidate(
                            savedTitle,
                            candidate
                    );
                } else {
                    addLink(savedTitle, candidate);
                }
            }
        }

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedTitle);
    }

    // Create TitleCandidate relationship
    private void addLink(Title title, Candidate candidate) {

        TitleCandidate link = new TitleCandidate();

        link.setTitle(title);
        link.setCandidate(candidate);
        link.setNo(candidate.getNo());
        link.setVotes(0);

        titleCandidateRepository.save(link);
    }

    // Delete title
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteTitle(
            @PathVariable Long id
    ) {

        return titleRepository.findById(id)
                .map(title -> {

                    if (titleTableService != null) {
                        titleTableService.dropTable(title);
                    } else {
                        titleCandidateRepository.deleteByTitle(title);
                    }

                    publishedTitleResultRepository.deleteByTitle(title);
                    titleRepository.delete(title);

                    return ResponseEntity
                            .noContent()
                            .<Void>build();
                })
                .orElse(
                        ResponseEntity
                                .notFound()
                                .build()
                );
    }

    private String normalizeTitleKey(String titleName) {
        return titleName == null ? "" : titleName.trim().toLowerCase(Locale.ROOT);
    }

    @GetMapping("/result-leaders")
    public List<Map<String, Object>> getPublishedResults() {
        return publishedTitleResultRepository.findAllByOrderByPublishedAtDesc().stream()
                .map(result -> Map.<String, Object>of(
                        "title", result.getTitle().getName(),
                        "candidateId", result.getCandidate().getId(),
                        "studentWeight", result.getStudentWeight(),
                        "teacherWeight", result.getTeacherWeight(),
                        "publishedAt", result.getPublishedAt().toString()))
                .toList();
    }

    @PutMapping("/{name}/result-leader")
    @Transactional
    public ResponseEntity<?> publishWeightedLeader(@PathVariable String name, @RequestBody Map<String, Integer> payload) {
        Title title = titleRepository.findByNameIgnoreCase(name).orElse(null);
        if (title == null) {
            return ResponseEntity.notFound().build();
        }

        int studentWeight = payload == null ? -1 : payload.getOrDefault("studentWeight", -1);
        int teacherWeight = payload == null ? -1 : payload.getOrDefault("teacherWeight", -1);
        if (studentWeight < 0 || teacherWeight < 0 || studentWeight + teacherWeight != 100) {
            return ResponseEntity.badRequest().body("Student and teacher weights must be non-negative and total 100.");
        }

        Candidate leader = null;
        double highestScore = Double.NEGATIVE_INFINITY;
        List<Map<String, Object>> rows = titleTableService.rows(title);
        double totalStudentVotes = rows.stream()
                .mapToDouble(row -> ((Number) row.get("student_votes")).doubleValue())
                .sum();
        double totalTeacherVotes = rows.stream()
                .mapToDouble(row -> ((Number) row.get("teacher_votes")).doubleValue())
                .sum();

        for (Map<String, Object> row : rows) {
            double studentScore = totalStudentVotes == 0 ? 0
                    : ((Number) row.get("student_votes")).doubleValue() / totalStudentVotes * studentWeight;
            double teacherScore = totalTeacherVotes == 0 ? 0
                    : ((Number) row.get("teacher_votes")).doubleValue() / totalTeacherVotes * teacherWeight;
            double score = studentScore + teacherScore;
            if (score > highestScore) {
                leader = candidateRepository.findById(((Number) row.get("candidate_id")).longValue()).orElse(null);
                highestScore = score;
            }
        }

        if (leader == null) {
            return ResponseEntity.badRequest().body("This title has no candidates to publish.");
        }

        PublishedTitleResult result = publishedTitleResultRepository.findByTitle(title)
                .orElseGet(PublishedTitleResult::new);
        result.setTitle(title);
        result.setCandidate(leader);
        result.setStudentWeight(studentWeight);
        result.setTeacherWeight(teacherWeight);
        result.setPublishedAt(Instant.now());
        publishedTitleResultRepository.save(result);

        return ResponseEntity.ok(Map.of(
                "title", title.getName(),
                "candidateId", leader.getId(),
                "studentWeight", studentWeight,
                "teacherWeight", teacherWeight));
    }

    @DeleteMapping("/{name}/result-leader")
    @Transactional
    public ResponseEntity<Void> removePublishedLeader(@PathVariable String name) {
        Title title = titleRepository.findByNameIgnoreCase(name).orElse(null);
        if (title == null) {
            return ResponseEntity.notFound().build();
        }
        publishedTitleResultRepository.deleteByTitle(title);
        return ResponseEntity.noContent().build();
    }

    // Vote for candidate
    @PutMapping("/{name}/candidates/{candidateId}/vote")
    @Transactional
    public ResponseEntity<?> vote(
            @PathVariable String name,
            @PathVariable Long candidateId,
            HttpSession session
    ) {

        Object studentId = session.getAttribute(
                "verifiedStudentId"
        );

        if (studentId == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Student OTP verification is required");
        }

        Voter voter = voterRepository
                .findByIdForUpdate((Long) studentId)
                .orElse(null);

        if (voter == null || !voter.isVerified()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Student OTP verification is required");
        }

        Title title = titleRepository.findByNameIgnoreCase(name).orElse(null);
        if (title == null) {
            return ResponseEntity
                    .notFound()
                    .build();
        }

        String titleKey = normalizeTitleKey(title.getName());

        if (voter.getVotedTitles().contains(titleKey)) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("You have already voted in title: " + title.getName());
        }

        int voteCount;
        try {
            voteCount = titleTableService.vote(title, candidateId, "student");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }

        voter.getVotedTitles().add(titleKey);

        long totalGenderTitles = titleRepository.findAll().stream()
                .filter(t -> t.getGender() != null && title.getGender() != null && t.getGender().equalsIgnoreCase(title.getGender()))
                .count();

        long votedGenderTitles = titleRepository.findAll().stream()
                .filter(t -> t.getGender() != null && title.getGender() != null && t.getGender().equalsIgnoreCase(title.getGender()))
                .filter(t -> voter.getVotedTitles().contains(t.getName().toLowerCase().trim()))
                .count();

        if (votedGenderTitles >= totalGenderTitles || voter.getVotedTitles().size() >= titleRepository.count()) {
            voter.setHasVoted(true);
        }

        voterRepository.save(voter);

        return ResponseEntity.ok(Map.of(
            "voteCount", voteCount,
            "hasVoted", voter.isHasVoted(),
            "votedTitles", voter.getVotedTitles()
        ));
    }

    @PutMapping("/teacher/{name}/candidates/{candidateId}/vote")
    @Transactional
    public ResponseEntity<?> teacherVote(
            @PathVariable String name,
            @PathVariable Long candidateId,
            HttpSession session
    ) {
        Object tokenObj = session.getAttribute("verifiedTeacherToken");
        String token = tokenObj == null ? null : tokenObj.toString();

        if (!teacherVoteTokenService.isValid(token)) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Teacher token verification is required");
        }

        Title title = titleRepository.findByNameIgnoreCase(name).orElse(null);
        if (title == null) {
            return ResponseEntity.notFound().build();
        }

        String titleKey = normalizeTitleKey(title.getName());
        if (teacherVoteTokenService.getVotedTitles(token).contains(titleKey)) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("This teacher has already voted in title: " + title.getName());
        }

        int voteCount;
        try {
            voteCount = titleTableService.vote(title, candidateId, "teacher");
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
        }
        teacherVoteTokenService.markVote(token, titleKey);

        return ResponseEntity.ok(Map.of(
                "voteCount", voteCount,
                "votedTitles", teacherVoteTokenService.getVotedTitles(token)
        ));
    }

    @PutMapping("/teacher/{name}/voteAll")
    @Transactional
    public ResponseEntity<?> teacherVoteAll(
            @PathVariable String name,
            HttpSession session
    ) {
        Object tokenObj = session.getAttribute("verifiedTeacherToken");
        String token = tokenObj == null ? null : tokenObj.toString();

        if (!teacherVoteTokenService.isValid(token)) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("Teacher token verification is required");
        }

        Title title = titleRepository.findByNameIgnoreCase(name).orElse(null);
        if (title == null) {
            return ResponseEntity.notFound().build();
        }

        String titleKey = normalizeTitleKey(title.getName());
        if (teacherVoteTokenService.getVotedTitles(token).contains(titleKey)) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("This teacher has already performed a vote-all in title: " + title.getName());
        }

        titleTableService.teacherVoteAllCandidates(title);
        teacherVoteTokenService.markVote(token, titleKey);

        return ResponseEntity.ok(Map.of(
                "message", "Teacher votes added for all candidates in title: " + title.getName(),
                "votedTitles", teacherVoteTokenService.getVotedTitles(token)
        ));
    }

    // (Reset endpoints removed — student/teacher vote reset removed by user request)
}
