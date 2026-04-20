package com.resq.ResQ_Plate.mcp.tools;

import com.resq.ResQ_Plate.dto.response.DonationResponse;
import com.resq.ResQ_Plate.service.DonationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;
import java.util.List;
import java.util.function.Function;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class AdminCopilotTools {

    private final DonationService donationService;

    // Tool Name: getAvailableDonations
    // Description: Retrieves a list of all currently available food donations on the platform.
    @Bean
    @Description("Retrieves a list of all currently available food donations on the platform. Use this to inform users about what food is currently ready to be rescued.")
    public Function<Void, List<DonationResponse>> getAvailableDonationsTool() {
        return (request) -> {
            log.info("MCP Tool Called: getAvailableDonations");
            return donationService.getAvailableDonations();
        };
    }

    public record DonorDonationsRequest(String donorEmail) {}

    // Tool Name: getDonationsByDonor
    // Description: Retrieves a list of donations for a given donor email.
    @Bean
    @Description("Retrieves a list of all donations (available, claimed, or completed) listed by a specific donor. Requires the donor's exact email address.")
    public Function<DonorDonationsRequest, List<DonationResponse>> getDonationsByDonorTool() {
        return (request) -> {
            log.info("MCP Tool Called: getDonationsByDonor for email {}", request.donorEmail());
            try {
                return donationService.getDonationsByDonorEmail(request.donorEmail());
            } catch (Exception e) {
                log.error("Error in getDonationsByDonor tool: {}", e.getMessage());
                throw new RuntimeException("Could not retrieve donations for this donor. They may not exist or have no history.");
            }
        };
    }
}
