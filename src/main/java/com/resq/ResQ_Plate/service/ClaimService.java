package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.dto.response.ClaimResponse;
import com.resq.ResQ_Plate.entity.Claim;
import com.resq.ResQ_Plate.entity.Donation;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.ClaimRepository;
import com.resq.ResQ_Plate.repository.DonationRepository;
import com.resq.ResQ_Plate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final QrCodeService qrCodeService;
    private final NotificationService notificationService;

    @Value("${resq.qr.base-url}")
    private String qrBaseUrl;

    /**
     * Claim a donation.
     * 1. Validates donation is still AVAILABLE
     * 2. Prevents double-booking
     * 3. Generates ZXing QR code with unique token
     * 4. Updates donation status to CLAIMED
     * 5. Broadcasts WebSocket events
     */
    @Transactional
    public ClaimResponse claimDonation(UUID donationId, String claimantEmail) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new RuntimeException("Donation not found: " + donationId));

        if (donation.getStatus() != Donation.Status.AVAILABLE) {
            throw new RuntimeException("This donation is no longer available (status: " + donation.getStatus() + ")");
        }

        User claimant = userRepository.findByEmail(claimantEmail)
                .orElseThrow(() -> new RuntimeException("Claimant account not found"));

        // Prevent double-booking
        claimRepository.findByDonationIdAndStatusNot(donationId, Claim.Status.CANCELLED)
                .ifPresent(existingClaim -> {
                    throw new RuntimeException("This donation has already been claimed");
                });

        // Generate unique QR token and encode MINIFIED JSON data (easier for low-res cameras to scan)
        String qrToken = UUID.randomUUID().toString();
        String qrPayload = "{\"orderId\":\"%s\",\"donorName\":\"%s\",\"claimantName\":\"%s\",\"qrToken\":\"%s\"}"
                .formatted(
                donationId.toString(),
                donation.getDonor() != null ? donation.getDonor().getName() : "Unknown",
                claimant.getName(),
                qrToken
        );
        String qrCodeBase64 = qrCodeService.generateQrCodeBase64(qrPayload);

        // Persist the claim
        Claim claim = Claim.builder()
                .donation(donation)
                .claimant(claimant)
                .qrToken(qrToken)
                .qrCodeBase64(qrCodeBase64)
                .status(Claim.Status.PENDING_PICKUP)
                .build();

        claim = claimRepository.save(claim);
        log.info("Donation [{}] claimed by {} — qrToken: {}", donationId, claimantEmail, qrToken);

        // Update donation status
        donation.setStatus(Donation.Status.CLAIMED);
        donationRepository.save(donation);

        // Notify the donor via WebSocket
        notificationService.notifyDonorOfClaim(
                donation.getDonor().getId().toString(),
                claimant.getName(),
                donation.getItemDescription()
        );
        notificationService.broadcastDonationStatusUpdate(donationId.toString(), "CLAIMED");

        return toResponse(claim);
    }

    /**
     * Verify pickup via QR code scan.
     * Called when a volunteer opens GET /api/qr/verify/{token}.
     */
    @Transactional
    public ClaimResponse verifyPickup(String qrToken) {
        Claim claim = claimRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new RuntimeException("Invalid or unrecognized QR code"));

        if (claim.getStatus() != Claim.Status.PENDING_PICKUP) {
            throw new RuntimeException("This QR code has already been used (status: " + claim.getStatus() + ")");
        }

        // Mark claim as completed
        claim.setStatus(Claim.Status.COMPLETED);
        claim.setPickedUpAt(LocalDateTime.now());
        claimRepository.save(claim);

        // Mark donation as completed
        Donation donation = claim.getDonation();
        donation.setStatus(Donation.Status.COMPLETED);
        donationRepository.save(donation);

        log.info("Pickup verified for donation [{}] by {}", donation.getId(), claim.getClaimant().getEmail());

        // Broadcast completion to dashboard
        notificationService.broadcastDonationStatusUpdate(donation.getId().toString(), "COMPLETED");
        notificationService.notifyPickupCompleted(
                claim.getClaimant().getId().toString(),
                donation.getItemDescription()
        );

        return toResponse(claim);
    }

    public ClaimResponse getClaimById(UUID id) {
        return claimRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
    }

    @Transactional(readOnly = true)
    public java.util.List<ClaimResponse> getClaimsByClaimantEmail(String email) {
        User claimant = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Claimant account not found"));
        return claimRepository.findByClaimantId(claimant.getId()).stream()
                .map(this::toResponse)
                .sorted((a, b) -> b.getClaimedAt().compareTo(a.getClaimedAt()))
                .toList();
    }

    private ClaimResponse toResponse(Claim c) {
        return ClaimResponse.builder()
                .id(c.getId())
                .donationId(c.getDonation().getId())
                .donationDescription(c.getDonation().getItemDescription())
                .claimantId(c.getClaimant().getId())
                .claimantName(c.getClaimant().getName())
                .qrToken(c.getQrToken())
                .qrCodeBase64(c.getQrCodeBase64())
                .status(c.getStatus().name())
                .claimedAt(c.getClaimedAt())
                .pickedUpAt(c.getPickedUpAt())
                .build();
    }
}
