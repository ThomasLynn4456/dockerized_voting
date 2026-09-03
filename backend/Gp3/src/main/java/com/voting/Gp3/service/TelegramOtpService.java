package com.voting.Gp3.service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class TelegramOtpService {

    private static final Logger log = LoggerFactory.getLogger(TelegramOtpService.class);

    private final RestClient restClient;
    private final String botToken;
    private final String otpMessageTemplate;
    private final Map<String, String> linkedChats = new ConcurrentHashMap<>();
    private final Map<String, Instant> linkExpiry = new ConcurrentHashMap<>();
    private final AtomicLong updateOffset = new AtomicLong(0);

    public TelegramOtpService(
            RestClient.Builder builder,
            @Value("${telegram.bot-token:}") String botToken,
            @Value("${telegram.api-url:https://api.telegram.org}") String apiUrl,
            @Value("${telegram.otp-message-template:Your voting verification code is: %s. This code expires in 5 minutes.}") String otpMessageTemplate) {
        this.restClient = builder
                .baseUrl(apiUrl)
                .build();
        this.botToken = botToken;
        this.otpMessageTemplate = otpMessageTemplate;
    }

    public boolean isConfigured() {
        return botToken != null && !botToken.isBlank();
    }

    public String createLinkToken() {
        String token = UUID.randomUUID().toString();
        linkExpiry.put(token, Instant.now().plusSeconds(300));
        return token;
    }

    public String createLinkUrl(String token) {
        try {
            Map<String, Object> response = restClient.get()
                    .uri("/bot{token}/getMe", botToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            Object result = response == null ? null : response.get("result");
            if (result instanceof Map<?, ?> bot && bot.get("username") != null) {
                return "https://t.me/" + bot.get("username") + "?start=" + token;
            }
        } catch (RestClientException ex) {
            log.warn("Unable to get Telegram bot username: {}", ex.getMessage());
        }
        throw new IllegalStateException("Telegram bot is not available");
    }

    public String getLinkedChat(String token) {
        Instant expiresAt = linkExpiry.get(token);
        if (expiresAt == null || expiresAt.isBefore(Instant.now())) {
            linkedChats.remove(token);
            linkExpiry.remove(token);
            return null;
        }
        return linkedChats.get(token);
    }

    @Scheduled(fixedDelay = 2000)
    public void receiveLinkUpdates() {
        if (!isConfigured() || linkExpiry.isEmpty()) {
            return;
        }

        try {
            Map<String, Object> response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/bot{token}/getUpdates")
                            .queryParam("offset", updateOffset.get())
                            .build(botToken))
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});

            Object result = response == null ? null : response.get("result");
            if (!(result instanceof Iterable<?> updates)) {
                return;
            }

            for (Object update : updates) {
                if (update instanceof Map<?, ?> updateMap) {
                    Object updateId = updateMap.get("update_id");
                    if (updateId instanceof Number number) {
                        updateOffset.set(number.longValue() + 1);
                    }
                    linkStartCommand(updateMap);
                }
            }
        } catch (RestClientException ex) {
            log.warn("Unable to read Telegram updates: {}", ex.getMessage());
        }
    }

    private void linkStartCommand(Map<?, ?> update) {
        Object messageObject = update.get("message");
        if (!(messageObject instanceof Map<?, ?> message)) {
            return;
        }
        Object chatObject = message.get("chat");
        if (!(chatObject instanceof Map<?, ?> chat) || chat.get("id") == null) {
            return;
        }
        String chatId = String.valueOf(chat.get("id"));

        Object textObject = message.get("text");
        String text = textObject instanceof String s ? s.trim() : "";

        if (text.startsWith("/start ")) {
            String token = text.substring(7).trim();
            if (linkExpiry.containsKey(token)) {
                linkedChats.put(token, chatId);
                log.info("Linked Telegram chatId {} for token {}", chatId, token);
                return;
            }
        }

        // A chat is linked only when Telegram supplies the exact /start token.
        // Linking arbitrary messages could assign one chat to another user's request.
    }

    public void sendOtp(String chatId, String otp) {
        if (!isConfigured()) {
            log.warn("Telegram bot is not configured; OTP delivery was skipped.");
            return;
        }

        if (chatId == null || chatId.isBlank()) {
            throw new IllegalStateException("Telegram chat ID is required to send OTP");
        }

        String message = String.format(otpMessageTemplate, otp);

        try {
            restClient.post()
                    .uri("/bot{token}/sendMessage", botToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "chat_id", chatId,
                            "text", message,
                            "parse_mode", "HTML"
                    ))
                    .retrieve()
                    .body(Map.class);
        } catch (RestClientException ex) {
            throw new IllegalStateException("Telegram OTP delivery failed for chatId " + chatId, ex);
        }
    }
}
