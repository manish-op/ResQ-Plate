package com.resq.ResQ_Plate.service;

import com.resq.ResQ_Plate.dto.response.DonationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcast a new donation to ALL connected recipients.
     * React subscription: stompClient.subscribe('/topic/donations/new', callback)
     */
    public void broadcastNewDonation(DonationResponse donation) {
        messagingTemplate.convertAndSend("/topic/donations/new", donation);
        log.info("Broadcast new donation [{}] to /topic/donations/new", donation.getId());
    }

    /**
     * Broadcast a donation status change (CLAIMED / COMPLETED / EXPIRED).
     * React subscription: stompClient.subscribe('/topic/donations/status', callback)
     */
    public void broadcastDonationStatusUpdate(String donationId, String newStatus) {
        Map<String, String> payload = Map.of(
                "donationId", donationId,
                "status", newStatus
        );
        messagingTemplate.convertAndSend("/topic/donations/status", payload);
        log.info("Broadcast status update for donation [{}]: {}", donationId, newStatus);
    }

    /**
     * Send a private notification to a specific donor.
     * The donor's React client subscribes to: /user/queue/notifications
     * Spring maps this to the user's session using the userId as principal name.
     *
     * @param donorUserId  The donor's UUID string used as the STOMP principal
     * @param claimantName Who claimed the food
     * @param itemDesc     What was claimed
     */
    public void notifyDonorOfClaim(String donorUserId, String claimantName, String itemDesc) {
        Map<String, String> payload = Map.of(
                "type", "CLAIM_RECEIVED",
                "message", claimantName + " has claimed your donation: " + itemDesc
        );
        messagingTemplate.convertAndSendToUser(donorUserId, "/queue/notifications", payload);
        log.info("Notified donor [{}] of claim by {}", donorUserId, claimantName);
    }

    /**
     * Notify a recipient that their pickup has been confirmed.
     */
    public void notifyPickupCompleted(String recipientUserId, String donationDesc) {
        Map<String, String> payload = Map.of(
                "type", "PICKUP_COMPLETE",
                "message", "Pickup confirmed for: " + donationDesc
        );
        messagingTemplate.convertAndSendToUser(recipientUserId, "/queue/notifications", payload);
    }
}
