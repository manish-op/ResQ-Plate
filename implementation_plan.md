# ResQ Plate — Backend Architecture Implementation Plan

## Overview

ResQ Plate is a real-time food rescue dispatch platform. The backend is a **Spring Boot 4.0.5 monolith** (Java 17) with four tightly-integrated subsystems:

| Pillar | Technology |
|---|---|
| AI Frictionless Listing | Spring AI + Google Gemini (or OpenAI) |
| Real-Time Broadcast | Spring WebSocket (STOMP over SockJS) |
| QR Pickup Verification | ZXing (ZBar) library |
| Tax Deduction Reports | Apache POI + Spring Scheduler + JavaMailSender |

**Current state**: Bare Spring Boot scaffold — one `Test.java` controller, no JPA, no security, no DB.

---

## User Review Required

> [!IMPORTANT]
> **AI Provider Choice**: The plan uses **Google Gemini** (via Spring AI's Vertex AI / Gemini starter) since this is a Google-adjacent stack. If you prefer OpenAI's GPT-4o, the wiring is identical — just swap the Spring AI starter. Please confirm.

> [!IMPORTANT]
> **PostgreSQL Connection**: You need a running PostgreSQL instance. The plan assumes `localhost:5432/resqplate`. Confirm DB credentials before Phase 1 execution.

> [!WARNING]
> **Spring Boot 4.0.5**: This is a very recent version. Spring AI's stable BOM is tested against Spring Boot 3.x. We will pin Spring AI `1.0.0-M6` which supports Boot 4.x milestones. If there are classpath conflicts at runtime, we will downgrade Boot to `3.4.x`.

> [!CAUTION]
> **Email for Tax Reports**: Apache POI generates the Excel file; JavaMailSender emails it. You must provide an SMTP host + credentials (e.g., Gmail App Password or SendGrid) in `application.properties`. This is a secret — never commit it.

---

## Proposed Architecture

### Package Structure

```
com.resq.ResQ_Plate
├── config/
│   ├── SecurityConfig.java          # JWT filter chain, CORS, public endpoints
│   ├── WebSocketConfig.java         # STOMP broker registry
│   ├── SpringAiConfig.java          # AI ChatClient bean
│   └── SchedulerConfig.java         # @EnableScheduling
│
├── entity/
│   ├── User.java                    # donors + recipients + admins
│   ├── Donation.java                # core listing entity
│   ├── Claim.java                   # claim record with QR token
│   └── TaxReport.java               # audit trail for generated reports
│
├── repository/
│   ├── UserRepository.java
│   ├── DonationRepository.java
│   ├── ClaimRepository.java
│   └── TaxReportRepository.java
│
├── dto/
│   ├── request/
│   │   ├── RegisterRequest.java
│   │   ├── LoginRequest.java
│   │   ├── AiListingRequest.java    # { "rawText": "..." }
│   │   └── ClaimRequest.java
│   └── response/
│       ├── AuthResponse.java        # { token, role, userId }
│       ├── DonationResponse.java
│       ├── ClaimResponse.java       # includes qrCodeBase64
│       └── ApiResponse.java         # generic wrapper
│
├── service/
│   ├── AuthService.java
│   ├── AiListingService.java        # Spring AI extraction logic
│   ├── DonationService.java
│   ├── ClaimService.java            # creates QR, marks pickup
│   ├── QrCodeService.java           # ZXing wrapper
│   ├── NotificationService.java     # WebSocket broadcast
│   ├── TaxReportService.java        # POI report generation
│   └── EmailService.java            # JavaMailSender
│
├── controller/
│   ├── AuthController.java          # /api/auth/**
│   ├── DonationController.java      # /api/donations/**
│   ├── ClaimController.java         # /api/claims/**
│   ├── QrController.java            # /api/qr/verify
│   └── ReportController.java        # /api/reports/**
│
├── security/
│   ├── JwtUtil.java
│   ├── JwtAuthFilter.java
│   └── CustomUserDetailsService.java
│
├── scheduler/
│   └── MonthlyReportScheduler.java  # @Scheduled cron
│
└── ResQPlateApplication.java
```

---

## Proposed Changes

### Phase 0 — Dependencies (`pom.xml`)

#### [MODIFY] [pom.xml](file:///c:/Users/HP/Desktop/ResQ_Plate/ResQ_Plate/pom.xml)

Replace current minimal dependencies with the full dependency set:

```xml
<!-- Core Web + JPA -->
<dependency>spring-boot-starter-web</dependency>
<dependency>spring-boot-starter-data-jpa</dependency>
<dependency>spring-boot-starter-websocket</dependency>
<dependency>spring-boot-starter-security</dependency>
<dependency>spring-boot-starter-mail</dependency>
<dependency>spring-boot-starter-validation</dependency>

<!-- Database -->
<dependency>postgresql (runtime)</dependency>

<!-- JWT -->
<dependency>io.jsonwebtoken:jjwt-api:0.12.6</dependency>
<dependency>io.jsonwebtoken:jjwt-impl:0.12.6 (runtime)</dependency>
<dependency>io.jsonwebtoken:jjwt-jackson:0.12.6 (runtime)</dependency>

<!-- Spring AI -->
<dependency>spring-ai-bom:1.0.0-M6 (BOM import)</dependency>
<dependency>spring-ai-openai-spring-boot-starter</dependency>
<!-- OR: spring-ai-vertex-ai-gemini-spring-boot-starter -->

<!-- QR Code -->
<dependency>com.google.zxing:core:3.5.3</dependency>
<dependency>com.google.zxing:javase:3.5.3</dependency>

<!-- Excel Reports -->
<dependency>org.apache.poi:poi-ooxml:5.3.0</dependency>

<!-- Utilities -->
<dependency>org.projectlombok:lombok (optional)</dependency>
<dependency>org.mapstruct:mapstruct:1.6.0</dependency>
```

---

### Phase 1 — Database Schema (`entity/`)

#### [NEW] `User.java`

```
@Entity @Table(name = "users")
- id (UUID, PK)
- email (unique)
- passwordHash
- name
- role (ENUM: DONOR, RECIPIENT, ADMIN)
- organizationName
- address
- latitude / longitude  ← for proximity matching
- createdAt
```

#### [NEW] `Donation.java`

```
@Entity @Table(name = "donations")
- id (UUID, PK)
- donor (@ManyToOne User)
- rawText          ← original sentence from the user
- category (ENUM: baked_goods, produce, dairy, cooked_meals, packaged)
- itemDescription
- quantity (int)
- estimatedWeightKg (BigDecimal)
- estimatedValueUsd (BigDecimal)
- urgency (ENUM: low, medium, high)
- expiresAt (LocalDateTime)
- status (ENUM: AVAILABLE, CLAIMED, COMPLETED, EXPIRED)
- createdAt
```

#### [NEW] `Claim.java`

```
@Entity @Table(name = "claims")
- id (UUID, PK)
- donation (@ManyToOne Donation)
- claimant (@ManyToOne User)
- qrToken (String, unique, UUID-based)
- qrCodeImagePath (String) ← stored on disk / S3
- claimedAt
- pickedUpAt (nullable)
- status (ENUM: PENDING_PICKUP, COMPLETED, CANCELLED)
```

#### [NEW] `TaxReport.java`

```
@Entity @Table(name = "tax_reports")
- id (UUID, PK)
- donor (@ManyToOne User)
- reportMonth (YearMonth)
- totalDonations (int)
- totalWeightKg (BigDecimal)
- totalEstimatedValue (BigDecimal)
- filePath (String)
- emailedAt (LocalDateTime)
- generatedAt
```

---

### Phase 2 — Security Layer (`security/` + `config/SecurityConfig.java`)

JWT-based stateless authentication.

**Flow:**
```
POST /api/auth/register  →  hashes password, saves User, returns JWT
POST /api/auth/login     →  validates credentials, returns JWT
Every other request      →  JwtAuthFilter extracts Bearer token, sets SecurityContext
```

**Public endpoints** (no JWT required):
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET  /api/donations` (browse available donations)
- `GET  /ws/**` (WebSocket handshake)
- `GET  /api/qr/verify/{token}` (volunteer scans QR at store)

**Role-based access**:
- `DONOR`: create donations, view own reports
- `RECIPIENT`: claim donations, scan QR
- `ADMIN`: all endpoints, trigger reports manually

---

### Phase 3 — AI Frictionless Listing

#### [NEW] `AiListingService.java`

```
Flow:
1. Receive rawText: "We have 15 loaves of sourdough and 2 trays of muffins..."
2. Build a structured prompt with a JSON schema hint
3. Call Spring AI's ChatClient.prompt().user(prompt).call().content()
4. Parse the JSON response with Jackson ObjectMapper
5. Populate and save a Donation entity
6. Broadcast via WebSocket
```

**Prompt Template** (stored in `resources/prompts/listing-extraction.st`):

```
You are a food donation assistant. Extract structured data from the following text.
Return ONLY valid JSON matching this schema, nothing else:
{
  "category": "one of: baked_goods | produce | dairy | cooked_meals | packaged",
  "itemDescription": "brief description",
  "quantity": <integer>,
  "estimatedWeightKg": <decimal>,
  "urgency": "one of: low | medium | high",
  "expiresAt": "<ISO-8601 datetime>"
}

Current date/time: {currentDateTime}
Donor text: "{rawText}"
```

**API Endpoint:**
```
POST /api/donations/ai-listing
Body: { "rawText": "We have 15 loaves..." }
Auth: Bearer <DONOR JWT>
Response: DonationResponse (includes extracted fields for user review before saving)
```

---

### Phase 4 — Real-Time WebSocket Broadcast

#### [NEW] `WebSocketConfig.java`

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    // SockJS endpoint: /ws
    // STOMP broker: /topic, /queue
    // App destination prefix: /app
}
```

#### [NEW] `NotificationService.java`

```java
// After a donation is saved:
messagingTemplate.convertAndSend(
    "/topic/donations",
    new DonationBroadcastEvent(donation)
);

// After a claim is made:
messagingTemplate.convertAndSendToUser(
    donorUserId,
    "/queue/notifications",
    "Your donation has been claimed by " + claimantName
);
```

**React Frontend subscription (reference):**
```js
stompClient.subscribe('/topic/donations', (message) => {
    // new donation card appears live
});
```

---

### Phase 5 — QR Code Pickup Verification

#### [NEW] `QrCodeService.java`

```
On claim creation:
1. Generate a UUID token → store in Claim.qrToken
2. Use ZXing QRCodeWriter to encode the URL:
   https://resqplate.app/api/qr/verify/{token}
3. Render to BufferedImage → convert to Base64 PNG
4. Return base64 string in ClaimResponse for frontend to render as <img>

On scan (store volunteer opens URL):
GET /api/qr/verify/{token}
1. Look up Claim by qrToken
2. Validate: status == PENDING_PICKUP, not expired
3. Update Claim.status → COMPLETED, Donation.status → COMPLETED
4. Set Claim.pickedUpAt = now()
5. Broadcast completion event via WebSocket
6. Return success HTML or JSON
```

---

### Phase 6 — Automated Tax Deduction Reports

#### [NEW] `MonthlyReportScheduler.java`

```java
@Scheduled(cron = "0 0 1 1 * *")  // 1 AM on the 1st of every month
public void generateMonthlyReports() {
    // Get all users with DONOR role
    // For each donor: query completed donations in the previous month
    // Call TaxReportService.generate(donor, donations)
}
```

#### [NEW] `TaxReportService.java` (Apache POI)

```
Excel report structure:
- Sheet 1: "Donation Summary"
  - Header row: Date | Item | Category | Qty | Weight (kg) | Est. Value ($)
  - One row per completed Claim
  - Footer: Totals row (SUM formulas)
  - Styled with org.apache.poi.ss.usermodel.CellStyle (bold headers, borders)

- Sheet 2: "Tax Summary"
  - Total donations count
  - Total estimated value (the deductible amount)
  - Business name & address
  - Report period

Save to: /reports/{year}/{month}/{donorId}.xlsx
Email to donor via EmailService
Save TaxReport entity to DB
```

**Manual trigger endpoint** (ADMIN):
```
POST /api/reports/generate?donorId={uuid}&month=2026-03
```

---

## API Endpoint Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register donor/recipient |
| POST | `/api/auth/login` | Public | Login, receive JWT |
| POST | `/api/donations/ai-listing` | DONOR | AI extract + save donation |
| POST | `/api/donations` | DONOR | Manual donation creation |
| GET | `/api/donations` | Public | List available donations |
| GET | `/api/donations/{id}` | Auth | Single donation detail |
| PATCH | `/api/donations/{id}/status` | DONOR/ADMIN | Update status |
| POST | `/api/claims` | RECIPIENT | Claim a donation |
| GET | `/api/claims/{id}` | Auth | Claim detail + QR |
| GET | `/api/qr/verify/{token}` | Public | Volunteer scans QR |
| POST | `/api/reports/generate` | ADMIN | Manual report trigger |
| GET | `/api/reports/{donorId}` | DONOR/ADMIN | List reports |
| GET | `/ws` | Public | STOMP WebSocket handshake |

---

## Database ERD (simplified)

```
users (1) ──────── (many) donations
                         |
                    (1)  |
                    claims (many) ── (1) users [claimant]
                         |
                    tax_reports (many) ── (1) users [donor]
```

---

## `application.properties` Keys Needed

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/resqplate
spring.datasource.username=postgres
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT
jwt.secret=YOUR_256_BIT_BASE64_SECRET
jwt.expiration.ms=86400000

# Spring AI (OpenAI example)
spring.ai.openai.api-key=YOUR_OPENAI_KEY
spring.ai.openai.chat.options.model=gpt-4o-mini

# Email (SMTP)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_GMAIL
spring.mail.password=YOUR_APP_PASSWORD
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# File storage
resq.reports.dir=./reports
resq.qr.base-url=http://localhost:8080
```

---

## Phased Execution Roadmap

| Phase | What Gets Built | Deliverable |
|---|---|---|
| **0** | Update `pom.xml` with all deps | Compiling project |
| **1** | Entities + Repositories + DB config | Tables auto-created |
| **2** | Security (JWT auth, register/login) | Working auth endpoints |
| **3** | Donation CRUD (manual + AI listing) | POST/GET donations |
| **4** | WebSocket broadcast | Live dashboard events |
| **5** | Claim + QR generation + verify | Full pickup flow |
| **6** | Tax report scheduler + email | Monthly Excel dispatch |
| **7** | Integration testing + CORS config | Frontend-ready API |

---

## Open Questions

> [!IMPORTANT]
> **Q1 — AI Model**: Do you want **OpenAI GPT-4o-mini** (easiest, $0.15/1M tokens) or **Google Gemini 2.0 Flash** (free tier available)? This changes one dependency + 3 config lines.

> [!IMPORTANT]
> **Q2 — QR verification UX**: When a volunteer scans the QR, should the backend return a **JSON response** (for a React page to display) or a **standalone HTML page** (works with any camera app, no app needed)? Standalone HTML is simpler for Phase 1.

> [!NOTE]
> **Q3 — File Storage**: QR images and Excel reports are saved to the local filesystem for now. Should we plan for S3 / cloud storage from the start, or keep it local for development?

> [!NOTE]
> **Q4 — Multi-tenancy / Geography**: Should nearby NGOs be filtered by GPS coordinates (latitude/longitude proximity query using Haversine formula in PostgreSQL), or is a simple city/district text match enough for v1?

---

## Verification Plan

### Automated Tests
- **Phase 2**: `curl -X POST /api/auth/register` + `curl -X POST /api/auth/login` → verify JWT returned
- **Phase 3**: `curl -X POST /api/donations/ai-listing -d '{"rawText":"15 loaves..."}'` → verify structured JSON saved
- **Phase 4**: Browser WebSocket test at `ws://localhost:8080/ws` via STOMP.js
- **Phase 5**: Create claim → render QR image → visit verify URL → check DB status = COMPLETED
- **Phase 6**: Manually call `POST /api/reports/generate` → check Excel file exists + email sent

### Manual Verification
- Connect React frontend (future) to all REST endpoints with valid JWTs
- Validate CORS headers allow `http://localhost:3000` (React dev server)
