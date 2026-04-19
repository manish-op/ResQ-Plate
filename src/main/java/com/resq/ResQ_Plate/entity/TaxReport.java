package com.resq.ResQ_Plate.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tax_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaxReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    /** Stored as "YYYY-MM" string since YearMonth has no default JPA mapping */
    @Column(nullable = false)
    private String reportMonth;

    private Integer totalDonations;
    private BigDecimal totalWeightKg;
    private BigDecimal totalEstimatedValue;

    /** File system path to the generated .xlsx file */
    private String filePath;

    /** Timestamp when the report was successfully emailed to the donor */
    private LocalDateTime emailedAt;

    @Column(updatable = false)
    private LocalDateTime generatedAt;

    @PrePersist
    protected void onCreate() {
        generatedAt = LocalDateTime.now();
    }
}
