package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.dto.request.ManualDonationRequest;
import com.resq.ResQ_Plate.dto.response.DonationResponse;
import com.resq.ResQ_Plate.entity.Donation;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.entity.Claim;
import com.resq.ResQ_Plate.repository.ClaimRepository;
import com.resq.ResQ_Plate.repository.DonationRepository;
import com.resq.ResQ_Plate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DonationService {

    private final DonationRepository donationRepository;
    private final UserRepository userRepository;
    private final ClaimRepository claimRepository;
    private final AiListingService aiListingService;
    private final NotificationService notificationService;

    // ─── AI-Powered Listing ────────────────────────────────────────────────────

    @Transactional
    public DonationResponse createFromAiListing(String rawText, String donorEmail) {
        User donor = findDonor(donorEmail);

        AiListingService.AiExtractedListing extracted = aiListingService.extractFromText(rawText);

        Donation donation = Donation.builder()
                .donor(donor)
                .rawText(rawText)
                .category(parseCategory(extracted.getCategory()))
                .itemDescription(extracted.getItemDescription())
                .quantity(extracted.getQuantity())
                .estimatedWeightKg(extracted.getEstimatedWeightKg())
                .urgency(parseUrgency(extracted.getUrgency()))
                .expiresAt(parseDateTime(extracted.getExpiresAt()))
                .status(Donation.Status.AVAILABLE)
                .build();

        donation = donationRepository.save(donation);
        log.info("AI listing created: {} ({})", donation.getId(), donation.getItemDescription());

        DonationResponse response = toResponse(donation);
        notificationService.broadcastNewDonation(response);

        return response;
    }

    // ─── Manual Listing ────────────────────────────────────────────────────────

    @Transactional
    public DonationResponse createManual(ManualDonationRequest request, String donorEmail) {
        User donor = findDonor(donorEmail);

        Donation donation = Donation.builder()
                .donor(donor)
                .category(parseCategory(request.getCategory()))
                .itemDescription(request.getItemDescription())
                .quantity(request.getQuantity())
                .estimatedWeightKg(request.getEstimatedWeightKg())
                .estimatedValueUsd(request.getEstimatedValueUsd())
                .urgency(parseUrgency(request.getUrgency()))
                .expiresAt(request.getExpiresAt())
                .status(Donation.Status.AVAILABLE)
                .build();

        donation = donationRepository.save(donation);
        log.info("Manual listing created: {} ({})", donation.getId(), donation.getItemDescription());

        DonationResponse response = toResponse(donation);
        notificationService.broadcastNewDonation(response);

        return response;
    }

    // ─── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DonationResponse> getAvailableDonations() {
        return donationRepository.findByStatus(Donation.Status.AVAILABLE)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DonationResponse getDonationById(UUID id) {
        return donationRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Donation not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> getDonationsByDonorEmail(String email) {
        User donor = findDonor(email);
        return donationRepository.findByDonorOrderByCreatedAtDesc(donor)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private User findDonor(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Donor account not found"));
    }

    public DonationResponse toResponse(Donation d) {
        String claimantName = null;
        String qrToken = null;
        if (d.getStatus() == Donation.Status.CLAIMED || d.getStatus() == Donation.Status.COMPLETED) {
            java.util.Optional<Claim> activeClaim = claimRepository.findByDonationId(d.getId()).stream()
                    .filter(c -> c.getStatus() != Claim.Status.CANCELLED)
                    .findFirst();
            if (activeClaim.isPresent()) {
                claimantName = activeClaim.get().getClaimant().getName();
                qrToken = activeClaim.get().getQrToken();
            }
        }

        return DonationResponse.builder()
                .id(d.getId())
                .donorId(d.getDonor() != null ? d.getDonor().getId() : null)
                .donorName(d.getDonor() != null ? d.getDonor().getName() : "Unknown Donor")
                .donorOrganization(d.getDonor() != null ? d.getDonor().getOrganizationName() : "Unknown Organization")
                .claimantName(claimantName)
                .qrToken(qrToken)
                .rawText(d.getRawText())
                .category(d.getCategory() != null ? d.getCategory().name() : null)
                .itemDescription(d.getItemDescription())
                .quantity(d.getQuantity())
                .estimatedWeightKg(d.getEstimatedWeightKg())
                .estimatedValueUsd(d.getEstimatedValueUsd())
                .urgency(d.getUrgency() != null ? d.getUrgency().name() : null)
                .expiresAt(d.getExpiresAt())
                .status(d.getStatus() != null ? d.getStatus().name() : "UNKNOWN")
                .createdAt(d.getCreatedAt())
                .build();
    }

    private Donation.Category parseCategory(String cat) {
        if (cat == null) return Donation.Category.OTHER;
        try {
            return Donation.Category.valueOf(cat.toUpperCase().replace(" ", "_"));
        } catch (IllegalArgumentException e) {
            return Donation.Category.OTHER;
        }
    }

    private Donation.Urgency parseUrgency(String urgency) {
        if (urgency == null) return Donation.Urgency.MEDIUM;
        try {
            return Donation.Urgency.valueOf(urgency.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Donation.Urgency.MEDIUM;
        }
    }

    private LocalDateTime parseDateTime(String dt) {
        if (dt == null) return LocalDateTime.now().plusHours(8);
        try {
            return LocalDateTime.parse(dt, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            log.warn("Could not parse expiresAt '{}', defaulting to +8h", dt);
            return LocalDateTime.now().plusHours(8);
        }
    }
}
