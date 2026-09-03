package com.voting.Gp3.controller;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.voting.Gp3.Voter;
import com.voting.Gp3.dto.VoterRequest;
import com.voting.Gp3.repository.VoterRepository;
import com.voting.Gp3.service.TelegramOtpService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/voters")
public class VoterController {

    private final VoterRepository voterRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();
    private final TelegramOtpService telegramOtpService;

public VoterController(
        VoterRepository voterRepository,
        PasswordEncoder passwordEncoder,
        TelegramOtpService telegramOtpService) {

    this.voterRepository = voterRepository;
    this.passwordEncoder = passwordEncoder;
    this.telegramOtpService = telegramOtpService;
}

    @PostMapping("/request-otp")
    public ResponseEntity<?> createVoter(
            @RequestBody VoterRequest request) {

        if (!telegramOtpService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Telegram OTP delivery is not configured."));
        }

        if (request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()
                || request.getTelegramChatId() == null || request.getTelegramChatId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number and Telegram chat ID are required."));
        }

        String phone = request.getPhoneNumber().trim();
        Instant now = Instant.now();
        Voter voter = voterRepository.findByPhoneNumber(phone).orElse(null);

        if (voter != null && voter.getOtpRequestedAt() != null
                && now.isBefore(voter.getOtpRequestedAt().plus(1, ChronoUnit.MINUTES))) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Please wait one minute before requesting another OTP."));
        }

        if (voter == null) {
            if (request.getUsername() == null || request.getUsername().isBlank()
                    || request.getMajor() == null || request.getMajor().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username, major, phone number, and Telegram chat ID are required."));
            }
            voter = new Voter();
            voter.setPhoneNumber(phone);
            voter.setUsername(request.getUsername().trim());
            voter.setMajor(request.getMajor().trim());
        } else {
            if (request.getUsername() != null && !request.getUsername().isBlank()) {
                voter.setUsername(request.getUsername().trim());
            }
            if (request.getMajor() != null && !request.getMajor().isBlank()) {
                voter.setMajor(request.getMajor().trim());
            }
        }

        voter.setTelegramChatId(request.getTelegramChatId().trim());
        if (request.getTelegramUsername() != null && !request.getTelegramUsername().isBlank()) {
            voter.setTelegramUsername(request.getTelegramUsername().trim());
        }

        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        String previousOtpHash = voter.getOtpHash();
        Instant previousOtpExpiry = voter.getOtpExpiresAt();
        Instant previousOtpRequest = voter.getOtpRequestedAt();
        boolean previouslyVerified = voter.isVerified();
        voter.setOtpHash(passwordEncoder.encode(otp));
        voter.setOtpExpiresAt(now.plus(5, ChronoUnit.MINUTES));
        voter.setOtpRequestedAt(now);
        voter.setVerified(false);
        voterRepository.save(voter);

        try {
            telegramOtpService.sendOtp(voter.getTelegramChatId(), otp);
        } catch (IllegalStateException ex) {
            voter.setOtpHash(previousOtpHash);
            voter.setOtpExpiresAt(previousOtpExpiry);
            voter.setOtpRequestedAt(previousOtpRequest);
            voter.setVerified(previouslyVerified);
            voterRepository.save(voter);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Telegram OTP delivery failed."));
        }

        return ResponseEntity.ok(Map.of("message", "OTP sent successfully to your Telegram account."));
    }

    @PostMapping("/verify-otp")
    @Transactional
    public ResponseEntity<?> verifyOtp(
            @RequestBody VoterRequest request,
            HttpServletRequest httpRequest,
            HttpSession session) {
        if (request.getPhoneNumber() == null || request.getOtp() == null || !request.getOtp().matches("\\d{6}")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Phone number and a six-digit OTP are required."));
        }

        Voter voter = voterRepository.findByPhoneNumber(request.getPhoneNumber().trim()).orElse(null);
        if (voter == null || voter.getOtpHash() == null || voter.getOtpExpiresAt() == null
                || !voter.getOtpExpiresAt().isAfter(Instant.now())
                || !passwordEncoder.matches(request.getOtp(), voter.getOtpHash())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP."));
        }

        voter.setVerified(true);
        voter.setOtpHash(null);
        voter.setOtpExpiresAt(null);
        voterRepository.save(voter);
        httpRequest.changeSessionId();
        session.setAttribute("verifiedStudentId", voter.getId());

        return ResponseEntity.ok(Map.of("message", "Student verified", "voterId", voter.getId(), "username", voter.getUsername()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getSessionVoter(HttpSession session) {
        Object studentId = session.getAttribute("verifiedStudentId");
        if (studentId == null) {
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        Voter voter = voterRepository.findById((Long) studentId).orElse(null);
        if (voter == null || !voter.isVerified()) {
            session.removeAttribute("verifiedStudentId");
            return ResponseEntity.ok(Map.of("authenticated", false));
        }
        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "id", voter.getId(),
            "username", voter.getUsername(),
            "major", voter.getMajor(),
            "phoneNumber", voter.getPhoneNumber(),
            "hasVoted", voter.isHasVoted(),
            "votedTitles", voter.getVotedTitles(),
            "verified", voter.isVerified()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

}
