# Comprehensive Testing Strategy

## 1. Testing Pyramid & Tooling Matrix
| Layer | Scope | Primary Tools | Automation Level |
|---|---|---|---|
| **Unit Testing** | Services, Validators, Mappers, Key Providers, Security Evaluators | JUnit 5, Mockito, AssertJ, Vitest | CI on every commit |
| **Integration Testing** | Repository queries, Security Filter Chains, Flyway migrations, LiveKit token generation | Spring Boot Test, H2 / Testcontainers PostgreSQL | CI on every PR |
| **End-to-End (E2E)** | Full user journeys: Google Auth, Room lifecycle, WebRTC E2EE signaling, Admin moderation | Playwright / Supertest | Automated in Staging/Local pipeline |
| **Security & Pentest** | OWASP Top 10, IDOR, Token misuse, Input injection, Rate limit bypass, E2EE leakage | OWASP ZAP, Custom security integration suites | Automated smoke + manual penetration passes |
| **Dependency Scanning** | Known CVEs in npm / Maven packages | Dependabot, OWASP Dependency-Check / Maven audit, npm audit | CI build gate |

## 2. Security Test Plan (Key Scenarios)
1. **Broken Access Control & IDOR**:
   - Verify User A cannot fetch, join, or terminate User B's private room without valid invite/password.
   - Verify ordinary users receive `403 Forbidden` on all `/api/admin/**` endpoints.
2. **Room Capacity & Boundary Enforcement**:
   - Verify backend refuses to issue LiveKit token if room already has 2 active participants.
   - Verify third user receives explicit `409 Conflict` (Room Full).
3. **E2EE Verification**:
   - Verify client generates cryptographic key in browser memory via Web Crypto API.
   - Verify backend receives 0 media keys during call handshake.
   - Verify admin endpoints return only metadata (room duration, user IDs) with zero media payload or encryption key exposure.
4. **Suspended / Banned User Enforcement**:
   - Verify suspended or banned users cannot initiate rooms, fetch tokens, or enter the matchmaking queue.
