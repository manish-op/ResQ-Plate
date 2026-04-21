package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.dto.request.MessageRequest;
import com.resq.ResQ_Plate.dto.response.ApiResponse;
import com.resq.ResQ_Plate.dto.response.MessageResponse;
import com.resq.ResQ_Plate.entity.AuditLog;
import com.resq.ResQ_Plate.entity.Message;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.UserRepository;
import com.resq.ResQ_Plate.service.AuditService;
import com.resq.ResQ_Plate.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<MessageResponse>> sendMessage(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MessageRequest request,
            HttpServletRequest httpServletRequest) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Message msg = chatService.sendMessage(user, request.getClaimId(), request.getContent());
        
        auditService.log(user, AuditLog.Action.MESSAGE_SEND, "Message sent for claim: " + request.getClaimId(), httpServletRequest);

        return ResponseEntity.ok(ApiResponse.success(mapToResponse(msg)));
    }

    @GetMapping("/history/{claimId}")
    public ResponseEntity<ApiResponse<List<MessageResponse>>> getHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID claimId) {
        
        // Fetch history
        List<Message> history = chatService.getChatHistory(claimId);
        
        List<MessageResponse> responses = history.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    private MessageResponse mapToResponse(Message msg) {
        return MessageResponse.builder()
                .id(msg.getId())
                .claimId(msg.getClaim().getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSender().getName())
                .content(msg.getContent())
                .timestamp(msg.getTimestamp())
                .build();
    }
}
