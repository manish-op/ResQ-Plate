package com.resq.ResQ_Plate.repository;

import com.resq.ResQ_Plate.entity.TaxReport;
import com.resq.ResQ_Plate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaxReportRepository extends JpaRepository<TaxReport, UUID> {

    List<TaxReport> findByDonorIdOrderByGeneratedAtDesc(UUID donorId);

    /** Prevents generating duplicate reports for the same donor + month */
    Optional<TaxReport> findByDonorAndReportMonth(User donor, String reportMonth);

    List<TaxReport> findByReportMonth(String reportMonth);
}
