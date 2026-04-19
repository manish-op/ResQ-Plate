package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.dto.request.AiListingRequest;
import com.resq.ResQ_Plate.dto.request.ManualDonationRequest;
import com.resq.ResQ_Plate.dto.response.ApiResponse;
import com.resq.ResQ_Plate.dto.response.DonationResponse;
import com.resq.ResQ_Plate.service.DonationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
public class DonationController {

    private final DonationService donationService;

    /**
     * POST /api/donations/ai-listing  [DONOR only]
     * Body: { "rawText": "We have 15 loaves of sourdough expiring tomorrow..." }
     * Gemini AI extracts category, quantity, urgency, expiry — saves and broadcasts.
     */
    @PostMapping("/ai-listing")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ApiResponse<DonationResponse>> createFromAiListing(
            @Valid @RequestBody AiListingRequest request,
            Authentication authentication) {
        DonationResponse response = donationService.createFromAiListing(
                request.getRawText(), authentication.getName()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Donation listed via AI! It's now live for nearby recipients.", response));
    }

    /**
     * POST /api/donations  [DONOR only]
     * Manual listing for donors who prefer form-based input.
     */
    @PostMapping
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ApiResponse<DonationResponse>> createManual(
            @Valid @RequestBody ManualDonationRequest request,
            Authentication authentication) {
        DonationResponse response = donationService.createManual(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Donation listed successfully.", response));
    }

    /**
     * GET /api/donations  [Public]
     * Returns all currently AVAILABLE donations for the browse dashboard.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DonationResponse>>> getAvailableDonations() {
        return ResponseEntity.ok(ApiResponse.success(donationService.getAvailableDonations()));
    }

    /**
     * GET /api/donations/{id}  [Public]
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DonationResponse>> getDonationById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(donationService.getDonationById(id)));
    }

    /**
     * GET /api/donations/my-donations  [DONOR only]
     * Returns the authenticated donor's complete donation history.
     */
    @GetMapping("/my-donations")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<ApiResponse<List<DonationResponse>>> getMyDonations(Authentication authentication) {
        return ResponseEntity.ok(
                ApiResponse.success(donationService.getDonationsByDonorEmail(authentication.getName()))
        );
    }
}
