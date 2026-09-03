package com.voting.Gp3.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.voting.Gp3.entity.TeacherVoteToken;
import com.voting.Gp3.service.TeacherVoteTokenService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/teacher")
public class TeacherTokenController {

    private final TeacherVoteTokenService teacherVoteTokenService;

    public TeacherTokenController(TeacherVoteTokenService teacherVoteTokenService) {
        this.teacherVoteTokenService = teacherVoteTokenService;
    }

    @PostMapping("/token")
    public ResponseEntity<?> generateToken() {
        TeacherVoteToken tokenRecord = teacherVoteTokenService.createToken("teacher");

        return ResponseEntity.ok(Map.of(
                "id", tokenRecord.getId(),
                "token", tokenRecord.getToken(),
                "expiresAt", tokenRecord.getExpiresAt().toString(),
                "createdAt", tokenRecord.getCreatedAt().toString(),
                "active", tokenRecord.isActive(),
                "used", tokenRecord.isUsed()
        ));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyToken(@RequestBody Map<String, String> payload, HttpSession session) {
        String token = payload == null ? null : payload.get("token");

        if (!teacherVoteTokenService.isValid(token)) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid or expired teacher token"));
        }

        session.setAttribute("verifiedTeacherToken", token);

        return ResponseEntity.ok(Map.of(
                "message", "Teacher voting session started",
                "token", token,
                "expiresAt", teacherVoteTokenService.getExpiry(token).toString(),
                "votedTitles", teacherVoteTokenService.getVotedTitles(token)
        ));
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus(HttpSession session) {
        Object tokenObj = session.getAttribute("verifiedTeacherToken");
        String token = tokenObj == null ? null : tokenObj.toString();

        if (!teacherVoteTokenService.isValid(token)) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Teacher token missing or expired"));
        }

        return ResponseEntity.ok(Map.of(
                "token", token,
                "expiresAt", teacherVoteTokenService.getExpiry(token).toString(),
                "votedTitles", teacherVoteTokenService.getVotedTitles(token)
        ));
    }

    @GetMapping("/tokens")
    public ResponseEntity<List<Map<String, Object>>> listTokens() {
        List<Map<String, Object>> payload = new java.util.ArrayList<>();

        for (TeacherVoteToken token : teacherVoteTokenService.findAll()) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", token.getId());
            item.put("token", token.getToken());
            item.put("createdAt", token.getCreatedAt().toString());
            item.put("expiresAt", token.getExpiresAt().toString());
            item.put("active", token.isActive());
            item.put("used", token.isUsed());
            item.put("teacherName", token.getTeacherName());
            item.put("votedTitles", teacherVoteTokenService.getVotedTitles(token.getToken()));
            payload.add(item);
        }

        return ResponseEntity.ok(payload);
    }

    @DeleteMapping("/tokens/{id}")
    public ResponseEntity<?> deleteToken(@PathVariable Long id) {
        teacherVoteTokenService.deleteToken(id);
        return ResponseEntity.noContent().build();
    }
}
