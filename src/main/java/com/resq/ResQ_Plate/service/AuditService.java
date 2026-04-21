package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.entity.AuditLog;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Log a security or critical action asynchronously to avoid blocking the main thread.
     */
    @Async
    public void log(User user, AuditLog.Action action, String description, HttpServletRequest request) {
        String ipAddress = "unknown";
        if (request != null) {
            ipAddress = request.getHeader("X-Forwarded-For");
            if (ipAddress == null || ipAddress.isEmpty()) {
                ipAddress = request.getRemoteAddr();
            }
        }

        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(action)
                .description(description)
                .ipAddress(ipAddress)
                .build();

        auditLogRepository.save(auditLog);
        log.info("Audit: User [{}] performed {} - {}", user != null ? user.getEmail() : "Anonymous", action, description);
    }
    
    // Simpler overload for internal services
    @Async
    public void log(User user, AuditLog.Action action, String description) {
        log(user, action, description, null);
    }
}
