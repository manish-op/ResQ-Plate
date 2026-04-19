package com.resq.ResQ_Plate.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resq.ResQ_Plate.dto.response.DonationResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiListingService {

        private final ObjectMapper objectMapper;
        private final ChatModel chatModel;

        private static final String PROMPT_TEMPLATE = """
                        You are a food donation data extraction assistant for ResQ Plate, a food rescue platform.
                        Extract structured data from the donor's message below.

                        Return ONLY a valid JSON object — no markdown fences, no explanation, just raw JSON.
                        Use EXACTLY this schema:
                        {
                          "category": "one of: BAKED_GOODS | PRODUCE | DAIRY | COOKED_MEALS | PACKAGED | OTHER",
                          "itemDescription": "concise description of the food item(s)",
                          "quantity": <total count as integer>,
                          "estimatedWeightKg": <estimated total weight in kilograms as decimal>,
                          "urgency": "one of: LOW | MEDIUM | HIGH",
                          "expiresAt": "<ISO-8601 local datetime string, e.g. 2026-04-18T08:00:00>"
                        }

                        Urgency rules:
                        - HIGH   = expires within 12 hours from now
                        - MEDIUM = expires within 24 hours from now
                        - LOW    = expires after 24+ hours from now
                        - If no expiry mentioned, assume HIGH and set expiresAt to 8 hours from now.

                        Weight estimation:
                        - 1 loaf of bread ≈ 0.9 kg
                        - 1 tray of muffins (12 pcs) ≈ 0.6 kg
                        - 1 cooked meal serving ≈ 0.5 kg
                        - 1 kg of produce ≈ 1.0 kg

                        Current date-time (use for expiresAt calculation): %s

                        Donor message: "%s"
                        """;

        public AiExtractedListing extractFromText(String rawText) {
                String promptText = String.format(PROMPT_TEMPLATE, LocalDateTime.now(), rawText);

                log.debug("Calling AI (Groq) for text extraction...");

                try {
                        // Using standard Spring AI ChatModel. Correct Groq base-url in properties
                        // will automatically route this through Groq's engine.
                        String jsonText = chatModel.call(promptText);

                        log.debug("Raw AI response: {}", jsonText);

                        // Strip markdown fences just in case
                        String cleanJson = jsonText
                                        .replaceAll("(?s)```json\\s*", "")
                                        .replaceAll("(?s)```\\s*", "")
                                        .trim();

                        AiExtractedListing result = objectMapper.readValue(cleanJson, AiExtractedListing.class);
                        log.info("AI extraction OK — category: {}, quantity: {}, urgency: {}",
                                        result.getCategory(), result.getQuantity(), result.getUrgency());
                        return result;

                } catch (Exception e) {
                        log.warn("AI call failed or quota exceeded. Error: {}. Initiating Rule-Based Fallback Parser.",
                                        e.getMessage());
                        return getFallbackResponse(rawText);
                }
        }

        /**
         * Fallback parser to keep the rescue flow alive when AI quota is exhausted.
         */
        private AiExtractedListing getFallbackResponse(String text) {
                String lower = text.toLowerCase();
                String category = "PACKAGED";
                if (lower.contains("bread") || lower.contains("muffin") || lower.contains("baked")
                                || lower.contains("loaf"))
                        category = "BAKED_GOODS";
                else if (lower.contains("fruit") || lower.contains("veg") || lower.contains("apple"))
                        category = "PRODUCE";
                else if (lower.contains("milk") || lower.contains("dairy") || lower.contains("cheese"))
                        category = "DAIRY";
                else if (lower.contains("order") || lower.contains("meal") || lower.contains("pizza")
                                || lower.contains("dosa") || lower.contains("idli"))
                        category = "COOKED_MEALS";

                AiExtractedListing fallback = new AiExtractedListing();
                fallback.setCategory(category);
                fallback.setItemDescription("Automatic Extraction (Fallback): " + text);
                fallback.setQuantity(5);
                fallback.setEstimatedWeightKg(BigDecimal.valueOf(2.5));
                fallback.setUrgency("HIGH");
                fallback.setExpiresAt(LocalDateTime.now().plusHours(8).toString());

                return fallback;
        }

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class AiExtractedListing {
                private String category;
                private String itemDescription;
                private Integer quantity;
                private BigDecimal estimatedWeightKg;
                private String urgency;
                private String expiresAt;
        }
}
