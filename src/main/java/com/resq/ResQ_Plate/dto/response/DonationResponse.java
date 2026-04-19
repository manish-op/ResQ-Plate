package com.resq.ResQ_Plate.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DonationResponse {
    private UUID id;
    private UUID donorId;
    private String donorName;
    private String donorOrganization;
    private String claimantName;
    private String qrToken;
    private String rawText;
    private String category;
    private String itemDescription;
    private Integer quantity;
    private BigDecimal estimatedWeightKg;
    private BigDecimal estimatedValueUsd;
    private String urgency;
    private LocalDateTime expiresAt;
    private String status;
    private LocalDateTime createdAt;
}
