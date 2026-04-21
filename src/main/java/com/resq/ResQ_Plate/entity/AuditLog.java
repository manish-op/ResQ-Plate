package com.resq.ResQ_Plate.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    public enum Action {
        LOGIN, REGISTER, LOGOUT, 
        DONATION_CREATE, DONATION_UPDATE, DONATION_DELETE,
        CLAIM_CREATE, CLAIM_COMPLETE, CLAIM_CANCEL,
        MESSAGE_SEND, USER_PROFILE_UPDATE, CHAT_MESSAGE_SENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Action action;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String ipAddress;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
