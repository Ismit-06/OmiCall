# Threat Model (STRIDE & Defense-in-Depth)

## 1. System Overview & Trust Boundaries
- **Untrusted Frontend / Web Clients**: Browser runtime executing React. Client inputs, WebRTC streams, local storage, URL params, and API payloads are untrusted.
- **TLS Boundary**: All HTTP/REST, WebSocket, and WebRTC traffic transported over TLS (WSS/HTTPS).
- **Backend Application Server (Spring Boot)**: Trusted coordination authority for authentication, room lifecycle, matchmaking, LiveKit token issuance, abuse reporting, and admin audits.
- **Relay/SFU Media Server (LiveKit)**: Relays WebRTC tracks between peers. With End-to-End Encryption (E2EE), LiveKit acts as an untrusted media router unable to inspect audio/video frames.
- **Database (PostgreSQL)**: Stores user metadata, hashed room passwords, call logs, report records, block lists, and admin audit trails. Never stores encryption keys or media.

---

## 2. STRIDE Threat Analysis

### A. Spoofing
- **Threat**: Attacker impersonates another user or spoofed Google OAuth identity.
- **Mitigation**: Rely strictly on Google OpenID Connect (OIDC) `sub` identifier verified by Spring Security OAuth2. Validate session cookies using `HttpOnly`, `SameSite=Lax/Strict`, and `Secure` flags. Reject forged user IDs on all mutating endpoints.

### B. Tampering
- **Threat**: Participant tampers with room parameters, alters matchmaking filters, modifies report records, or manipulates WebRTC packets.
- **Mitigation**: Server-side validation of all DTOs (Bean Validation). LiveKit tokens signed with cryptographic JWT secret. Media packets encrypted client-side using WebRTC Insertable Streams (LiveKit E2EE) preventing tamper in flight.

### C. Repudiation
- **Threat**: Administrator or abusive user denies carrying out actions (e.g., kicking participants, modifying roles, submitting false reports).
- **Mitigation**: Comprehensive append-only audit logging table for administrative events with timestamps, actor IDs, target IDs, and request correlation IDs.

### D. Information Disclosure
- **Threat**: Unintended eavesdropping on private video/audio; leakage of room passwords, user PII, or internal tokens.
- **Mitigation**: 
  1. Client-to-client E2EE for media frames using Web Cryptography API & LiveKit E2EE key provider.
  2. Passwords hashed using BCrypt (never stored in plaintext).
  3. No media encryption keys transmitted to or logged by the backend.
  4. Admin dashboard strictly isolated: administrators cannot view or decrypt media streams.

### E. Denial of Service (DoS) / Exhaustion
- **Threat**: Mass room creation, rapid queue flooding in random matchmaking, resource exhaustion on WebSocket connections.
- **Mitigation**: Rate limiting (Bucket4j / token bucket per IP/User), participant caps strictly enforced (max 2 participants per room enforced by backend token claim and room state check), automatic room expiration and stale queue pruning.

### F. Elevation of Privilege
- **Threat**: Standard user elevates privileges to `ADMIN` or accesses `/admin` endpoints, or accesses another user's private room (IDOR).
- **Mitigation**: Spring Security role hierarchy (`ROLE_USER`, `ROLE_ADMIN`). Role assignment strictly restricted to secure bootstrap configuration. Dynamic permission checks verifying room ownership and membership on every API call.
