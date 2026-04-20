package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.SystemPromptTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
@Slf4j
public class ChatbotController {

    private final ChatClient.Builder chatClientBuilder;
    private final com.resq.ResQ_Plate.repository.UserRepository userRepository;

    public record ChatbotRequest(String message) {}
    public record ChatbotResponse(String reply, String downloadUrl) {}

    @PostMapping("/message")
    public ResponseEntity<ChatbotResponse> chat(@RequestBody ChatbotRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        log.info("Chatbot interaction by {}: {}", user.getEmail(), request.message());

        ChatClient chatClient = chatClientBuilder.build();

        String systemText = """
                You are the friendly, helpful ResQ Plate in-app assistant.
                The user currently talking to you is {name} ({role}) with email {email}.
                The current date/year is {currentDate}.
                
                You have access to MCP tools to generate tax reports or fetch available donations or user history.
                If they ask for a tax report, politely tell them if it succeeded or not.
                If they want their donation history, fetch and list it clearly.
                Be concise and cheerful. If a user asks a general question, answer appropriately.
                """;

        SystemPromptTemplate systemTemplate = new SystemPromptTemplate(systemText);
        var systemMessage = systemTemplate.createMessage(Map.of(
                "name", user.getName(),
                "role", user.getRole().name(),
                "email", user.getEmail(),
                "currentDate", LocalDate.now().toString()
        ));

        // Call LLM with function calling enabled via Spring AI automatically discovering @Bean Functions
        String responseContent = chatClient.prompt(new Prompt(List.of(systemMessage, new UserMessage(request.message()))))
                .functions("generateTaxReportTool", "getDonationsByDonorTool", "getAvailableDonationsTool")
                .call()
                .content();

        // Very basic way to extract downloadUrl if the LLM mentions it. In reality we'd structure the prompt better or use actual tool response parsing.
        String parsedUrl = null;
        if (responseContent != null && responseContent.contains("http://localhost:8080/api/reports/download?path=")) {
            // Extract the URL simply for the frontend to show a download button
            Pattern p = Pattern.compile("(http://localhost:8080/api/reports/download\\?path=[^\\s)\\]]+)");
            Matcher m = p.matcher(responseContent);
            if (m.find()) {
                parsedUrl = m.group(1);
            }
        }

        return ResponseEntity.ok(new ChatbotResponse(responseContent, parsedUrl));
    }
}
