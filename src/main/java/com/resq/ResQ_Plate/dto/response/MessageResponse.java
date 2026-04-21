package com.resq.ResQ_Plate.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MessageResponse {
    private UUID id;
    private UUID claimId;
    private UUID senderId;
    private String senderName;
    private String content;
    private LocalDateTime timestamp;
}
