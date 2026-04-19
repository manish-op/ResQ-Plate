package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.dto.request.ClaimRequest;
import com.resq.ResQ_Plate.dto.response.ApiResponse;
import com.resq.ResQ_Plate.dto.response.ClaimResponse;
import com.resq.ResQ_Plate.service.ClaimService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;

    /**
     * POST /api/claims  [RECIPIENT only]
     * Body: { "donationId": "uuid" }
     * Prevents double-booking, generates QR code, returns base64 QR for display.
     */
    @PostMapping
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<ApiResponse<ClaimResponse>> claimDonation(
            @Valid @RequestBody ClaimRequest request,
            Authentication authentication) {
        ClaimResponse response = claimService.claimDonation(
                request.getDonationId(), authentication.getName()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Donation claimed! Show the QR code to the donor on pickup.", response));
    }

    /**
     * GET /api/claims/{id}  [Authenticated]
     * Fetch claim details including the QR code (for re-display).
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClaimResponse>> getClaimById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(claimService.getClaimById(id)));
    }

    /**
     * POST /api/claims/verify-pickup/{token} [Authenticated]
     * Programmatic verification endpoint used by the Donor Dashboard.
     * Returns JSON instead of HTML to avoid frontend parse errors.
     */
    @PostMapping("/verify-pickup/{token}")
    public ResponseEntity<ApiResponse<ClaimResponse>> verifyPickup(@PathVariable String token) {
        return ResponseEntity.ok(ApiResponse.success(claimService.verifyPickup(token)));
    }

    /**
     * GET /api/claims/my-claims  [RECIPIENT only]
     */
    @GetMapping("/my-claims")
    @PreAuthorize("hasRole('RECIPIENT')")
    public ResponseEntity<ApiResponse<java.util.List<ClaimResponse>>> getMyClaims(Authentication authentication) {
        return ResponseEntity.ok(
                ApiResponse.success(claimService.getClaimsByClaimantEmail(authentication.getName()))
        );
    }
}
