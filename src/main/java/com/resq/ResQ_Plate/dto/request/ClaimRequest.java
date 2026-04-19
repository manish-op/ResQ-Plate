package com.resq.ResQ_Plate.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ClaimRequest {

    @NotNull(message = "Donation ID is required")
    private UUID donationId;
}
