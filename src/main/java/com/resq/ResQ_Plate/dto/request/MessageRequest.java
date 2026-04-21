package com.resq.ResQ_Plate.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MessageRequest {
    private UUID claimId;
    private String content;
}
