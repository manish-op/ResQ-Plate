package com.resq.ResQ_Plate.controller;

import com.resq.ResQ_Plate.dto.response.ClaimResponse;
import com.resq.ResQ_Plate.service.ClaimService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class QrController {

  private final ClaimService claimService;

  /**
   * GET /api/qr/verify/{token} [Public — no auth required]
   *
   * This endpoint is the QR code target URL.
   * When a volunteer scans the QR code at the store with any camera app,
   * their browser opens this URL and sees a confirmation page.
   *
   * Flow:
   * 1. Validates the qrToken from DB
   * 2. Marks Claim status → COMPLETED
   * 3. Marks Donation status → COMPLETED
   * 4. Broadcasts WebSocket event to live dashboard
   * 5. Returns a standalone HTML confirmation page
   */
  @GetMapping(value = "/verify/{token}", produces = MediaType.TEXT_HTML_VALUE)
  public ResponseEntity<String> verifyPickup(@PathVariable String token) {
    try {
      ClaimResponse claim = claimService.verifyPickup(token);
      return ResponseEntity.ok(buildSuccessHtml(claim));
    } catch (RuntimeException e) {
      log.error("QR Verification failed for token [{}]: {}", token, e.getMessage());
      return ResponseEntity.badRequest().body(buildErrorHtml(e.getMessage()));
    }
  }

  private String buildSuccessHtml(ClaimResponse claim) {
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ResQ Plate — Pickup Confirmed</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .card {
              background: white;
              border-radius: 20px;
              padding: 48px 40px;
              max-width: 440px;
              width: 100%%;
              box-shadow: 0 20px 60px rgba(0,0,0,0.12);
              text-align: center;
            }
            .icon { font-size: 72px; margin-bottom: 16px; }
            h1 { color: #15803d; font-size: 28px; margin-bottom: 8px; }
            .subtitle { color: #6b7280; margin-bottom: 28px; }
            .info-block {
              background: #f0fdf4;
              border: 1px solid #bbf7d0;
              border-radius: 12px;
              padding: 16px 20px;
              margin: 16px 0;
              text-align: left;
            }
            .info-block p { color: #374151; margin: 4px 0; font-size: 15px; }
            .info-block strong { color: #15803d; }
            .badge {
              display: inline-block;
              background: #16a34a;
              color: white;
              font-weight: 700;
              padding: 10px 28px;
              border-radius: 999px;
              font-size: 16px;
              margin-top: 24px;
              letter-spacing: 0.5px;
            }
            .footer { color: #9ca3af; font-size: 12px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>Pickup Confirmed!</h1>
            <p class="subtitle">The food has been successfully handed over.</p>
            <div class="info-block">
              <p><strong>Item:</strong> %s</p>
              <p><strong>Received by:</strong> %s</p>
              <p><strong>Status:</strong> Transaction Complete</p>
            </div>
            <div class="badge">✔ COMPLETED</div>
            <p class="footer">Powered by ResQ Plate — Zero Waste Food Rescue Network</p>
          </div>
        </body>
        </html>
        """.formatted(
        claim.getDonationDescription() != null ? claim.getDonationDescription() : "Food Donation",
        claim.getClaimantName() != null ? claim.getClaimantName() : "Recipient");
  }

  private String buildErrorHtml(String message) {
    return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>ResQ Plate — Error</title>
          <style>
            body { font-family: Arial, sans-serif; background: #fff1f2;
                   display: flex; align-items: center; justify-content: center;
                   min-height: 100vh; padding: 20px; }
            .card { background: white; border-radius: 20px; padding: 48px 40px;
                    max-width: 440px; text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.12); }
            .icon { font-size: 72px; margin-bottom: 16px; }
            h1 { color: #dc2626; margin-bottom: 12px; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <h1>Verification Failed</h1>
            <p>%s</p>
            <p style="margin-top:16px; font-size:12px; color:#9ca3af;">
              If you believe this is an error, contact your ResQ Plate coordinator.
            </p>
          </div>
        </body>
        </html>
        """.formatted(message);
  }
}
