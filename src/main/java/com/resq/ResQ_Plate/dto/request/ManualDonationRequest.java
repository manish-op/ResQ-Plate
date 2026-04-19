package com.resq.ResQ_Plate.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ManualDonationRequest {

    @NotBlank(message = "Item description is required")
    private String itemDescription;

    private String category;
    private Integer quantity;
    private BigDecimal estimatedWeightKg;
    private BigDecimal estimatedValueUsd;

    /** "LOW", "MEDIUM", or "HIGH" */
    private String urgency;

    @NotNull(message = "Expiration date/time is required")
    private LocalDateTime expiresAt;
}
