package com.resq.ResQ_Plate.repository;

import com.resq.ResQ_Plate.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClaimRepository extends JpaRepository<Claim, UUID> {

    /** Used during QR scan verification */
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "donation", "claimant", "donation.donor" })
    Optional<Claim> findByQrToken(String qrToken);

    /** Check if a donation already has an active claim */
    Optional<Claim> findByDonationIdAndStatusNot(UUID donationId, Claim.Status status);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "donation", "claimant", "donation.donor" })
    List<Claim> findByClaimantId(UUID claimantId);

    List<Claim> findByDonationId(UUID donationId);
}
