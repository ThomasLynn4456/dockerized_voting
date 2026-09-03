package com.voting.Gp3.controller;

import java.net.URI;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.voting.Gp3.service.TelegramOtpService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/telegram")
public class TelegramController {

    private final TelegramOtpService telegramOtpService;

    public TelegramController(TelegramOtpService telegramOtpService) {
        this.telegramOtpService = telegramOtpService;
    }

    @GetMapping("/link")
    public ResponseEntity<?> createLink(HttpSession session) {
        String token = telegramOtpService.createLinkToken();
        session.setAttribute("telegramLinkToken", token);
        try {
            return ResponseEntity.ok(Map.of("url", telegramOtpService.createLinkUrl(token)));
        } catch (IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/launch")
    public ResponseEntity<?> launchBot(HttpSession session) {
        String token = telegramOtpService.createLinkToken();
        session.setAttribute("telegramLinkToken", token);
        try {
            String telegramUrl = telegramOtpService.createLinkUrl(token);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(telegramUrl))
                    .build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/link/status")
    public ResponseEntity<?> linkStatus(HttpSession session) {
        Object token = session.getAttribute("telegramLinkToken");
        String chatId = token == null ? null : telegramOtpService.getLinkedChat(String.valueOf(token));
        return ResponseEntity.ok(Map.of("linked", chatId != null, "chatId", chatId == null ? "" : chatId));
    }
}
