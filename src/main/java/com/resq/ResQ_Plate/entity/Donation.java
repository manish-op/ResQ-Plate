package com.resq.ResQ_Plate.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "donations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Donation {

    public enum Category {
        BAKED_GOODS, PRODUCE, DAIRY, COOKED_MEALS, PACKAGED, OTHER
    }

    public enum Urgency {
        LOW, MEDIUM, HIGH
    }

    public enum Status {
        AVAILABLE, CLAIMED, COMPLETED, EXPIRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    /** The original free-text sentence typed by the business worker */
    @Column(columnDefinition = "TEXT")
    private String rawText;

    @Enumerated(EnumType.STRING)
    private Category category;

    private String itemDescription;
    private Integer quantity;
    private BigDecimal estimatedWeightKg;
    private BigDecimal estimatedValueUsd;

    @Enumerated(EnumType.STRING)
    private Urgency urgency;

    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.AVAILABLE;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = Status.AVAILABLE;
    }
}
