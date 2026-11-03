# Morning Verification & Action Checklist

Everything has been implemented and verified through automated test suites and production builds. Here is the manual verification checklist to execute when you wake up.

---

## 1. External Credentials to Plug In
In `.env` at the root directory:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```
*In Google Cloud Console*: Set Authorized Redirect URI to:
`http://localhost:8080/login/oauth2/code/google`

---

## 2. Booting Local Infrastructure
1. Start Docker Desktop on Windows.
2. Run in terminal:
   ```powershell
   docker compose up -d
   ```
   *This starts PostgreSQL on port 5432 and LiveKit Server on port 7880.*

---

## 3. Running Backend & Frontend
1. **Backend**:
   ```powershell
   cd api
   mvn spring-boot:run
   ```
   Verified health URL: `http://localhost:8080/api/health`

2. **Frontend**:
   ```powershell
   cd web
   npm run dev
   ```
   Visit: `http://localhost:5173`

---

## 4. Manual Feature Tests
- [ ] **Google Login**: Click "Sign in with Google", sign in, verify your avatar and display name show up on the home page.
- [ ] **Private Room (Couple Call)**:
  1. Click "Create Room" (with optional password).
  2. Copy the invite link.
  3. Open an Incognito window, paste the invite link, and join.
  4. Verify: Both windows see local & remote camera streams, mic/cam controls toggle, and the 🔐 E2EE indicator is active.
  5. Open a 3rd window and attempt to join: Verify the backend rejects the 3rd participant with "Room is full".
- [ ] **Random Video Matching**:
  1. Open `/random` in Window A (select interests: e.g., "coding").
  2. Open `/random` in Window B (select interests: e.g., "coding").
  3. Click "Find a Partner" on both: Verify they connect automatically in a WebRTC video room.
  4. Click "Next ⏭": Verify Window A instantly leaves and re-enters the matching queue cleanly.
  5. Click "Block" or "Report": Verify the report record is saved and blocked users are never matched again.
- [ ] **Admin Dashboard (`/admin`)**:
  1. Set your Google ID in `application.yml` (`ADMIN_BOOTSTRAP_GOOGLE_ID`) and `ADMIN_BOOTSTRAP_ENABLED=true`.
  2. Visit `http://localhost:5173/admin`.
  3. Verify: Live statistics (Active rooms, users, pending reports), report review, and user status controls (Suspend/Ban).
