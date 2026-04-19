# ResQ Plate — Backend Implementation Walkthrough

## ✅ Build Status: `BUILD SUCCESS`

All 42 backend files created and compiling cleanly with `mvn clean compile`.

---

## What Was Built

### Phase 0 — `pom.xml` (Complete Dependency Stack)
| Dependency | Purpose |
|---|---|
| `spring-boot-starter-webmvc` | REST API |
| `spring-boot-starter-websocket` | STOMP WebSocket |
| `spring-boot-starter-data-jpa` | ORM |
| `postgresql` | Database driver |
| `spring-boot-starter-security` | JWT auth |
| `jjwt-api/impl/jackson 0.12.6` | JWT generation |
| `spring-ai-openai-spring-boot-starter` | AI listing (Gemini via OpenAI API) |
| `com.google.zxing:core + javase 3.5.3` | QR code generation |
| `poi-ooxml 5.3.0` | Excel tax reports |
| `spring-boot-starter-mail` | Email dispatch |
| `spring-boot-starter-validation` | Input validation |
| `lombok` | Boilerplate reduction |

### Phase 1 — JPA Entities (4 tables auto-created)

| Entity | Table | Key Fields |
|---|---|---|
| `User` | `users` | `id (UUID)`, `email`, `role (DONOR/RECIPIENT/ADMIN)`, lat/lng |
| `Donation` | `donations` | `rawText`, `category`, `quantity`, `urgency`, `status`, `expiresAt` |
| `Claim` | `claims` | `qrToken (unique)`, `qrCodeBase64`, `status`, `pickedUpAt` |
| `TaxReport` | `tax_reports` | `reportMonth`, `totalWeightKg`, `totalEstimatedValue`, `filePath` |

### Phase 2 — Security (JWT Stateless)

```
POST /api/auth/register → BCrypt hash + save User → return JWT
POST /api/auth/login    → AuthenticationManager validates → return JWT
Every request           → JwtAuthFilter extracts Bearer → SecurityContext
```

**Role-based access:**
- `DONOR` — create AI/manual listings, view own history & reports
- `RECIPIENT` — claim donations, scan QR
- `ADMIN` — trigger manual reports, view all data
- `Public` — browse donations, QR verify endpoint, WebSocket handshake

### Phase 3 — AI Frictionless Listing (Spring AI + Gemini)

> **Gemini Integration Strategy**: Uses `spring-ai-openai-spring-boot-starter` pointed at Gemini's official OpenAI-compatible API endpoint. No Vertex AI or GCP project needed.

```
Property config:
  spring.ai.openai.api-key=YOUR_GEMINI_API_KEY
  spring.ai.openai.base-url=https://generativelanguage.googleapis.com/v1beta/openai/
  spring.ai.openai.chat.options.model=gemini-2.0-flash
```

**Flow:**
```
POST /api/donations/ai-listing
Body: { "rawText": "We have 15 loaves of sourdough expiring tomorrow morning" }
  ↓
AiListingService sends structured prompt to Gemini
  ↓
Gemini returns: { "category": "BAKED_GOODS", "quantity": 15, "urgency": "HIGH", "expiresAt": "2026-04-18T08:00:00" }
  ↓
Donation saved to DB → broadcast via WebSocket
```

### Phase 4 — Real-Time WebSocket (STOMP)

**Frontend connection (React):**
```js
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);
stompClient.connect({}, () => {
    // New donation appears live
    stompClient.subscribe('/topic/donations/new', msg => { ... });
    // Status changes (CLAIMED/COMPLETED)
    stompClient.subscribe('/topic/donations/status', msg => { ... });
    // Private donor notifications
    stompClient.subscribe('/user/queue/notifications', msg => { ... });
});
```

### Phase 5 — QR Code Pickup Verification (ZXing)

```
Recipient claims donation → Claim created with unique UUID token
ZXing encodes "http://localhost:8080/api/qr/verify/{token}" → 300x300 PNG
PNG converted to Base64 data URI → returned in ClaimResponse
  
Volunteer opens QR URL from any camera app:
GET /api/qr/verify/{token} (public)
  ↓
Claim.status → COMPLETED, Donation.status → COMPLETED
  ↓
Beautiful HTML confirmation page rendered in browser
WebSocket broadcasts COMPLETED event to dashboard
```

### Phase 6 — Tax Reports (Apache POI + Scheduler)

```
Cron: 0 0 1 1 * * (1 AM on 1st of every month)
  ↓
For each DONOR user:
  Query COMPLETED donations for previous month
  Generate 2-sheet Excel workbook:
    Sheet 1: Donation Summary (date, item, category, qty, weight, value)
    Sheet 2: Tax Summary (totals, org info, deduction note)
  Save to ./reports/{year}/{month}/{donorId}.xlsx
  Email to donor with styled HTML body + xlsx attachment
```

**Manual trigger (ADMIN):**
```
POST /api/reports/generate?donorId={uuid}&month=2026-03
```

---

## Full API Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register as DONOR, RECIPIENT, or ADMIN |
| POST | `/api/auth/login` | Public | Login, receive JWT |
| GET | `/api/auth/me` | JWT | Current session info |
| POST | `/api/donations/ai-listing` | DONOR | AI-powered donation listing |
| POST | `/api/donations` | DONOR | Manual donation listing |
| GET | `/api/donations` | Public | Browse available donations |
| GET | `/api/donations/{id}` | Public | Single donation detail |
| GET | `/api/donations/my-donations` | DONOR | Donor's full history |
| POST | `/api/claims` | RECIPIENT | Claim a donation + get QR |
| GET | `/api/claims/{id}` | JWT | Claim detail + QR code |
| GET | `/api/qr/verify/{token}` | Public | Volunteer scans QR → HTML page |
| POST | `/api/reports/generate` | ADMIN | Trigger tax report manually |
| GET | `/api/reports/donor/{id}` | DONOR/ADMIN | List reports for a donor |
| GET | `/api/health` | Public | Server health check |
| GET | `/ws` | Public | STOMP WebSocket handshake |

---

## Project Structure (Final)

```
src/main/java/com/resq/ResQ_Plate/
├── config/
│   ├── SecurityConfig.java     ← JWT filter chain, CORS
│   ├── WebSocketConfig.java    ← STOMP broker
│   └── SpringAiConfig.java     ← ChatClient bean
├── controller/
│   ├── AuthController.java
│   ├── DonationController.java
│   ├── ClaimController.java
│   ├── QrController.java       ← returns HTML page
│   ├── ReportController.java
│   └── HealthController.java
├── dto/
│   ├── request/  (5 DTOs with @Valid)
│   └── response/ (4 DTOs + generic ApiResponse<T>)
├── entity/
│   ├── User.java, Donation.java, Claim.java, TaxReport.java
├── exception/
│   └── GlobalExceptionHandler.java  ← @RestControllerAdvice
├── repository/ (4 JPA repositories)
├── scheduler/
│   └── MonthlyReportScheduler.java  ← @Scheduled cron
├── security/
│   ├── JwtUtil.java, JwtAuthFilter.java
│   └── CustomUserDetailsService.java
└── service/
    ├── AuthService.java
    ├── AiListingService.java   ← Gemini NLP
    ├── DonationService.java
    ├── ClaimService.java       ← QR generation
    ├── QrCodeService.java      ← ZXing wrapper
    ├── NotificationService.java ← WebSocket broadcast
    ├── TaxReportService.java   ← POI Excel builder
    └── EmailService.java       ← JavaMailSender
```

---

## Remaining Setup Steps

> [!IMPORTANT]
> **1. Get Gemini API Key** — Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey), create a free key, paste into `application.properties`:
> ```
> spring.ai.openai.api-key=AI...your_key_here
> ```

> [!IMPORTANT]
> **2. Gmail App Password** — Visit [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords), generate an App Password for "Mail", paste into `application.properties`:
> ```
> spring.mail.username=your@gmail.com
> spring.mail.password=xxxx xxxx xxxx xxxx
> ```

> [!NOTE]
> **3. Start the server** — The database `resqplate` already exists. Run:
> ```
> mvn spring-boot:run
> ```
> Hibernate will auto-create all 4 tables on first start (`ddl-auto=update`).

> [!TIP]
> **4. Test the system** — Use the quick test sequence:
> ```bash
> # Register a donor
> POST http://localhost:8080/api/auth/register
> { "email":"bakery@test.com", "password":"password1", "name":"Sunny Bakery", "role":"DONOR" }
>
> # List donation via AI
> POST http://localhost:8080/api/donations/ai-listing
> Authorization: Bearer {token}
> { "rawText": "We have 20 croissants and 3 loaves of rye bread going bad tonight" }
>
> # Verify health
> GET http://localhost:8080/api/health
> ```
