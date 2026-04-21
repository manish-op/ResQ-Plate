package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.entity.Claim;
import com.resq.ResQ_Plate.entity.Message;
import com.resq.ResQ_Plate.entity.User;
import com.resq.ResQ_Plate.repository.ClaimRepository;
import com.resq.ResQ_Plate.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final MessageRepository messageRepository;
    private final ClaimRepository claimRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Message sendMessage(User sender, UUID claimId, String content) {
        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new RuntimeException("Claim not found"));

        // Basic authorization check: sender must be either the donor or the claimant
        boolean isDonor = claim.getDonation().getDonor().getId().equals(sender.getId());
        boolean isClaimant = claim.getClaimant().getId().equals(sender.getId());

        if (!isDonor && !isClaimant) {
            throw new RuntimeException("Unauthorized: You are not part of this claim context");
        }

        Message message = Message.builder()
                .claim(claim)
                .sender(sender)
                .content(content)
                .build();

        message = messageRepository.save(message);

        // Determine recipient
        User recipient = isDonor ? claim.getClaimant() : claim.getDonation().getDonor();

        // Broadcast to specific user queue
        messagingTemplate.convertAndSendToUser(
                recipient.getId().toString(),
                "/queue/messages",
                message
        );
        
        // Also send back to sender's other sessions
        messagingTemplate.convertAndSendToUser(
                sender.getId().toString(),
                "/queue/messages",
                message
        );

        log.info("Message sent from {} to {} for claim {}", sender.getEmail(), recipient.getEmail(), claimId);
        return message;
    }

    public List<Message> getChatHistory(UUID claimId) {
        return messageRepository.findByClaimIdOrderByTimestampAsc(claimId);
    }
}
