package com.resq.ResQ_Plate.repository;

import com.resq.ResQ_Plate.entity.Donation;
import com.resq.ResQ_Plate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DonationRepository extends JpaRepository<Donation, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Donation> findWithLockById(UUID id);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "donor" })
    List<Donation> findByStatus(Donation.Status status);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "donor" })
    List<Donation> findByDonor(User donor);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "donor" })
    List<Donation> findByDonorOrderByCreatedAtDesc(User donor);

    /**
     * Used by the tax report scheduler to find completed donations for a donor
     * within a specific month's date range.
     */
    List<Donation> findByDonorAndStatusAndCreatedAtBetween(
            User donor,
            Donation.Status status,
            LocalDateTime start,
            LocalDateTime end);

    /**
     * For expiry job: find donations that are still AVAILABLE but past their expiry
     */
    List<Donation> findByStatusAndExpiresAtBefore(Donation.Status status, LocalDateTime now);
}
