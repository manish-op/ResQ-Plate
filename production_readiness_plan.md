# ResQ Plate — Production Readiness Plan (Phase 3)

This plan is focused on turning your mostly completed MVP into a reliable, safe, and scalable live system for donors, NGOs, and budget-conscious claimants.

## 1) Success Criteria (Go-Live Definition)

A release is "production-ready" only when all of the following are true:

- **Reliability**: 99.9% monthly API uptime; no critical donation/claim data loss.
- **Latency**:
  - AI listing parse p95 < 2.5s
  - Claim action p95 < 500ms
  - WebSocket broadcast delivery p95 < 1s
- **Data integrity**: zero double-booking incidents in load/stress tests.
- **Security**: no high/critical findings in SAST/dependency scan; least-privilege DB and service accounts.
- **Operational readiness**: on-call runbook, alerting, dashboards, backup/restore tested.

## 2) Gap Assessment Against Current Build

Your repository already contains core capabilities for:

- AI listing ingestion (`AiListingService`, `DonationService`).
- Real-time notifications (`WebSocketConfig`, `NotificationService`).
- QR verification flow (`QrCodeService`, `QrController`, `ClaimService`).
- Tax report generation + scheduling (`TaxReportService`, `MonthlyReportScheduler`).
- MCP tools for admin/support/auto-claim use cases.

The biggest remaining gaps are mostly **production engineering**, not feature coding:

1. **Resilience**: retry, idempotency, circuit-breaking, and dead-letter patterns.
2. **Observability**: distributed tracing, SLO-based alerting, and auditability.
3. **Security hardening**: secrets management, abuse controls, MCP authorization boundaries.
4. **Data governance**: retention policy, PII minimization, compliance logging.
5. **Operations**: deployment strategy, rollback, load testing, and incident workflows.

## 3) Critical Improvements (Priority Order)

## P0 — Must Complete Before Broad Live Rollout

### A. Claim Idempotency + Concurrency Safety

- Add a strict idempotency key for claim/complete endpoints.
- Enforce DB-level uniqueness on active claim per donation.
- Use transaction boundaries + row locking (`SELECT ... FOR UPDATE`) for claim transitions.
- Return deterministic response on duplicate retries.

**Why:** This is the highest-risk area for user trust (double-booking).

### B. AI Parsing Guardrails

- Store both raw text and structured parse + confidence score.
- Introduce schema validation and reject invalid/ambiguous parses.
- Add fallback UX: if confidence below threshold, ask one clarifying question.
- Build a small offline evaluation set (100–300 real examples) and track extraction precision/recall over time.

**Why:** AI errors become operational failures in dispatch.

### C. Secrets + Access Hardening

- Move all secrets from local properties to managed secret store (AWS Secrets Manager/GCP Secret Manager/Vault).
- Rotate JWT/email/API keys with versioned secrets.
- Require scoped API keys or OAuth for MCP clients.
- Add per-tool authorization checks in MCP methods (admin-only analytics; NGO-scoped claim actions).

### D. Observability Baseline

- Add Micrometer + Prometheus metrics (API, queue/backlog, websocket sessions, AI latency/cost).
- Add OpenTelemetry traces across HTTP + DB + AI calls.
- Structured JSON logs with correlation IDs.
- Alerts:
  - claim failure rate > 2% for 10m
  - websocket disconnect surge
  - scheduler/report generation failure

### E. Backup, Restore, and DR

- Automated PostgreSQL PITR backups.
- Weekly restore drill into staging with documented RTO/RPO.
- Keep generated tax reports in durable object storage with lifecycle policy.

## P1 — Needed for Stable Growth (Weeks 2–6)

### A. Queue-Backed Async Workflows

- Move non-interactive tasks (emailing, tax report generation, heavy AI enrichment) to a job queue.
- Use retry policies with exponential backoff and dead-letter queues.

### B. Real-Time Dispatch Quality

- Geo-index donor/recipient locations.
- Ranking policy for matching (distance, urgency, NGO eligibility, pickup capacity).
- Reservation TTL for claims (auto-release if no pickup progress).

### C. Abuse and Fraud Prevention

- Rate limits per IP/user/org on listing, claim, and MCP endpoints.
- Device fingerprint or anomaly scoring on suspicious repeated claims.
- Immutable audit logs for claim and QR scan transitions.

### D. Frontend Reliability UX

- Clear websocket reconnect status and optimistic UI rollback.
- Distinct states: AVAILABLE / RESERVED / PICKED_UP / EXPIRED.
- Manual fallback path when scanner fails (one-time secure code).

## P2 — Enterprise/Scale Enhancements

- Multi-region failover for mission-critical metros.
- Fine-grained tenant isolation for large NGO networks.
- Cost governance dashboards (AI token spend, email/reporting spend).
- Model routing strategy (fast model default, high-accuracy fallback).

## 4) MCP-Specific Hardening Plan

Since you are introducing an MCP surface, treat it as a privileged integration API:

- **Tool-level RBAC**: each tool method enforces actor role + org scope.
- **Policy checks**: `claimDonation(donationId, ngoId)` must verify NGO eligibility, radius constraints, and active reservations.
- **Auditability**: log every MCP call (tool name, actor, org, params hash, outcome, latency).
- **Safety limits**: cap auto-claim volume per NGO agent to prevent resource hoarding.
- **Versioning**: semantic version your MCP tool contracts.

## 5) Data & Compliance Checklist

- Data retention policy by entity type (donation, claim, report, chat/support).
- PII encryption at rest for sensitive fields (phone/address where applicable).
- Consent and purpose limitation for any user-facing AI interactions.
- Tamper-evident audit records for tax report generation and delivery.
- Business continuity SOP for missed pickup disputes.

## 6) Recommended Delivery Plan (45 Days)

### Sprint 1 (Days 1–10)

- Idempotency + transaction safety for claim and pickup flows.
- Structured AI parse validation + confidence handling.
- Metrics/logging/tracing baseline.

### Sprint 2 (Days 11–20)

- Secrets migration + key rotation + MCP auth hardening.
- Alerting and on-call runbook.
- Backup automation and first restore test.

### Sprint 3 (Days 21–32)

- Queue-backed async for reports/emails.
- Reservation TTL + anti-hoarding rules.
- Load tests (peak-hour simulations).

### Sprint 4 (Days 33–45)

- Canary rollout by city/partner cohort.
- Incident game days.
- Final go-live checklist and production sign-off.

## 7) Go-Live Checklist (Practical)

- [ ] Blue/green or canary deployment is configured.
- [ ] Rollback tested in staging within 10 minutes.
- [ ] DB migration rollback strategy documented.
- [ ] SLO dashboards visible to engineering + ops.
- [ ] Pager alerts routed to at least 2 responders.
- [ ] Security scan clean (no critical/high).
- [ ] DPA/privacy policy and terms published.
- [ ] Pilot cohort support channel staffed during launch week.

## 8) KPI Dashboard You Should Track Weekly

- Pounds rescued per week/month.
- Mean time-to-claim (post listing).
- Claim completion rate.
- Expired-without-claim rate.
- AI parse correction rate.
- False/abusive claim rate.
- Tax report generation success rate.
- Active NGO/donor retention (30-day).

## 9) Immediate Next 5 Actions (Start This Week)

1. Add claim idempotency + DB uniqueness guards.
2. Add parse confidence + low-confidence clarification workflow.
3. Add end-to-end tracing + three critical alerts.
4. Add MCP tool authorization + audit logs.
5. Run one realistic load test and fix top bottleneck.

---

If you execute the P0 items first, you will de-risk the platform substantially and make the move from "feature-complete" to "live-user ready" with far fewer incidents.
