package com.resq.ResQ_Plate.mcp.tools;

import com.resq.ResQ_Plate.dto.response.ClaimResponse;
import com.resq.ResQ_Plate.service.ClaimService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.UUID;
import java.util.function.Function;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class NgoClaimAgentTools {

    private final ClaimService claimService;

    public record ClaimRequest(String donationId, String claimantEmail, String idempotencyKey) {}

    // Tool Name: claimDonation
    // Description: Claims a donation on behalf of an NGO/Recipient.
    @Bean
    @Description("Claims a specific food donation on behalf of a recipient/NGO. Requires the unique UUID of the donation and the email address of the claiming user. Returns a confirmation including the pickup QR code token.")
    public Function<ClaimRequest, ClaimResponse> claimDonationTool() {
        return (request) -> {
            log.info("MCP Tool Called: claimDonation for {} by {}", request.donationId(), request.claimantEmail());
            try {
                String idempotencyKey = (request.idempotencyKey() == null || request.idempotencyKey().isBlank())
                        ? "mcp-" + UUID.randomUUID()
                        : request.idempotencyKey();
                return claimService.claimDonation(
                        UUID.fromString(request.donationId()),
                        request.claimantEmail(),
                        idempotencyKey);
            } catch (Exception e) {
                log.error("Error in claimDonation tool: {}", e.getMessage());
                throw new RuntimeException("Failed to claim donation: " + e.getMessage());
            }
        };
    }
}
