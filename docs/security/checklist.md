# Security Checklist & Verification Matrix

- [ ] **1. Authentication Security**
  - [ ] Google OIDC `sub` used as canonical subject identity (never email alone).
  - [ ] Session cookie configured with `HttpOnly`, `SameSite=Lax`, and `Secure` (production).
  - [ ] Strict logout invalidating server session and clearing cookies.
  - [ ] Account status check on every request (`ACTIVE`, `SUSPENDED`, `BANNED`).

- [ ] **2. Authorization & Privilege Boundaries**
  - [ ] Role-based authorization (`ROLE_USER`, `ROLE_ADMIN`).
  - [ ] Resource-level access control on rooms, tokens, matches, and reports.
  - [ ] Automated IDOR regression tests covering all `/api/rooms/*` and `/api/calls/*`.
  - [ ] Admin endpoints (`/api/admin/**`) strictly accessible only to `ROLE_ADMIN`.

- [ ] **3. E2EE & Privacy Architecture**
  - [ ] LiveKit E2EE enabled using WebRTC Insertable Streams.
  - [ ] Key generation strictly in client runtime using `window.crypto.subtle`.
  - [ ] Media encryption keys never sent to Spring Boot backend or logged.
  - [ ] Admin panel displays only call/room metadata, never keys, transcripts, or streams.

- [ ] **4. Rate Limiting & Input Validation**
  - [ ] Bean Validation (`@NotNull`, `@Size`, `@Pattern`) on all incoming DTOs.
  - [ ] Room code randomness verified (cryptographically secure random token, non-enumerable).
  - [ ] Rate limits applied on authentication, room creation, and matchmaking endpoints.

- [ ] **5. Audit Logging & Non-Repudiation**
  - [ ] Admin audit log table with timestamps, admin ID, action type, target ID, and reason.
  - [ ] Audit records are append-only.
  - [ ] Zero sensitive data in audit logs (no passwords, OAuth secrets, session tokens, or E2EE keys).
