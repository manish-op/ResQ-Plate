package com.resq.ResQ_Plate.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ClaimResponse {
    private UUID id;
    private UUID donationId;
    private String donationDescription;
    private UUID claimantId;
    private String claimantName;
    private String qrToken;
    /** Base64 PNG data URI: "data:image/png;base64,..." — render directly in <img src="..."> */
    private String qrCodeBase64;
    private String donorAddress;
    private Double donorLatitude;
    private Double donorLongitude;
    private String status;
    private LocalDateTime claimedAt;
    private LocalDateTime pickedUpAt;
}
