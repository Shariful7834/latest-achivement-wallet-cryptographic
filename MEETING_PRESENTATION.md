# Meeting Presentation — Academic Achievement Wallet

## Open Badges 3.0: Academic Achievement Wallet with Moodle Integration

**Presenter:** Shariful  
**Date:** April 2026  
**Project:** Master's Thesis / Practical Project — FH Dortmund

---

## 1. Introduction (2 min)

Good [morning/afternoon] everyone. Today I'll be presenting the **Academic Achievement Wallet** — a system I've built that implements the **Open Badges 3.0 specification** to enable secure, consent-based sharing of verifiable credentials between a university LMS and a student-controlled digital wallet.

The core idea is simple: **students own their credentials**. A university can't just pull a student's certificates whenever it wants. Instead, the student decides who gets access, for how long, and can revoke that access at any time.

The system has three main components:

1. **A Wallet Application** — where students store and manage their OB 3.0 credentials (Node.js backend + React frontend)
2. **A Moodle LMS Plugin** — where professors search students, announce certificates, and request access to credentials
3. **A Docker-based Moodle instance** — running Moodle 4.5 with MariaDB, simulating a real university environment

---

## 2. Architecture Overview (2 min)

Let me walk you through the architecture.

```
┌──────────────────────┐              ┌──────────────────────────┐
│    Moodle LMS        │              │  Academic Achievement    │
│    (Docker)          │    REST      │  Wallet                  │
│                      │◄────────────►│                          │
│  Port 8080           │    API       │  Backend:  Port 4000     │
│  Plugin: academic_   │              │  Frontend: Port 5173     │
│          wallet      │              │                          │
└──────────────────────┘              └──────────────────────────┘
         │                                       │
         ▼                                       ▼
   MariaDB 10.11                          JSON flat-file DB
   (Docker volume)                        (data/db.json)
```

The **wallet backend** runs on Node.js with Express, uses JWT for authentication, and API keys for external system integration. The **frontend** is built with React 19, Vite, and TailwindCSS. The **Moodle plugin** is a standard Moodle local plugin written in PHP that communicates with the wallet via REST API.

All communication between Moodle and the Wallet uses API key authentication. Student-facing operations use JWT tokens.

---

## 3. Technology Stack (1 min)

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| Wallet Backend | Node.js, Express, JWT, bcrypt, UUID           |
| Wallet Frontend| React 19, Vite 6, TailwindCSS 4, Axios       |
| Moodle LMS     | PHP 8.3, Moodle 4.5 (Docker)                 |
| Moodle Plugin  | PHP, Moodle API (local plugin)                |
| Database       | MariaDB 10.11 (Moodle), JSON flat-file (Wallet) |
| Standard       | Open Badges 3.0 / W3C Verifiable Credentials 2.0 |
| Infrastructure | Docker Compose, Vite dev proxy                |

---

## 4. What I Implemented — Feature Walkthrough (15 min)

### 4.1 User Roles & Authentication

The wallet supports three roles with different permissions:

| Role    | Email                  | What they can do                                      |
|---------|------------------------|-------------------------------------------------------|
| Admin   | admin@wallet.local     | Manage users, verify uploads, approve claims, audit   |
| Student | student@university.edu | View credentials, approve access, upload certificates |
| Viewer  | viewer@company.com     | Search students, view shared credentials              |

**DEMO:** I'll show the login page and demonstrate role-based dashboards.

- Login as **student** → shows credential count, pending announcements, upload status
- Login as **admin** → shows system stats: total users, credentials, pending items
- Login as **viewer** → shows search interface for student credentials

---

### 4.2 Credential Management

Students can acquire OB 3.0 credentials in three ways:

1. **Claim from announcement** — a professor announces a certificate is available, students claim it, admin approves
2. **Upload a certificate** — students upload PDF/JPG/PNG/JSON files, admin verifies and converts to OB 3.0
3. **Import from Moodle** — students fetch their earned Moodle badges and import them as OB 3.0 credentials

**DEMO:** Navigate to the Credentials page to show existing OB 3.0 credentials. Each credential contains:
- Issuer information
- Achievement name and description
- Issue date
- Full OB 3.0 JSON-LD structure (toggleable view)

---

### 4.3 Certificate Upload & Verification Workflow

This is the workflow for students who have certificates from external sources:

```
Student uploads PDF/JPG ──► Admin sees it in "Pending Uploads"
                                    │
                           Admin reviews the file
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              ✅ Verify                        ❌ Reject
         (Creates OB 3.0                  (Student notified)
          credential)
```

**DEMO:** 
1. Login as student → go to Upload Certificate page
2. Upload a file, enter certificate name and description
3. Switch to admin account → go to Admin Panel → Uploads tab
4. Show the pending upload with download link
5. Verify it → the student now has a new OB 3.0 credential

---

### 4.4 Announcements — Moodle to Wallet Bridge

Professors can broadcast certificate announcements from Moodle. Students see these in their wallet and can respond by uploading proof.

```
Professor (Moodle)                    Student (Wallet)
       │                                    │
       │  POST /api/announce-certificate    │
       │───────────────────────────────────►│
       │                                    │
       │              Announcement appears  │
       │              on /announcements     │
       │                                    │
       │          Student uploads proof     │
       │◄───────────────────────────────────│
       │                                    │
       │     Admin verifies & approves      │
       │              ──────────►           │
       │                    OB 3.0 credential created
```

**DEMO:**
1. Open Moodle (http://localhost:8080) → login as admin
2. Click "Announce Certificate" button in the top navbar (or sidebar)
3. Fill in: achievement name = "Cloud Computing Fundamentals", type = "Certificate", course ID, criteria
4. Submit → the announcement is created
5. Switch to wallet frontend → login as student
6. Go to Announcements page → the new announcement appears
7. Student can upload their certificate as a response

---

### 4.5 Flow 1 — Consent-Based Credential Sharing (Key Feature)

This is the **main integration flow** and the most important feature. It implements the OB 3.0 consent cycle:

```
Step 1: Moodle (professor) ──► POST /wallet/access/request
        "I need this student's German B2 certificate"

Step 2: Student sees notification ──► GET /wallet/notifications
        "FH Dortmund Moodle wants access to your German B2 credential"

Step 3: Student approves ──► POST /wallet/access/grant
        → Access token issued (7-day expiry)

Step 4: Moodle reads credential ──► GET /ims/ob/v3p0/credentials
        Authorization: Bearer <access_token>
        → Signed OB 3.0 verifiable credential returned
```

**DEMO — From the Moodle side:**
1. In Moodle, go to "Search Student Credentials" → search for "student"
2. View Max Mustermann's credentials
3. Use the "Request Access" form → enter credential type "German B2" and a message
4. Click Send Request

**DEMO — From the Wallet side:**
1. Login as student@university.edu in the wallet
2. Go to Notifications page → see the pending request from Moodle
3. The request shows: who is asking, what they want, and why
4. Click "Approve" → an access token is issued with 7-day expiry
5. The request moves to the "History" section

**DEMO — Back in Moodle (reading with the token):**
1. Go to "My Access Requests" in the Moodle sidebar
2. The request now shows status: "Approved"
3. Click "Read Credentials" → the OB 3.0 credential is displayed
4. Toggle JSON-LD view to see the full W3C Verifiable Credential structure

The student can **revoke** this access at any time from the Notifications page.

---

### 4.6 OB 3.0 Standard Endpoints

The wallet implements the standard OB 3.0 API endpoints as defined in the spec:

| Endpoint                         | Description                         |
|----------------------------------|-------------------------------------|
| `GET /ims/ob/v3p0/credentials`   | List all OB 3.0 credentials        |
| `GET /ims/ob/v3p0/credentials/:id` | Get single credential             |
| `GET /ims/ob/v3p0/profile`       | Get holder/issuer profile           |

These endpoints accept both Bearer tokens (from Flow 1) and API keys (for authorized systems). The credentials are returned in full OB 3.0 JSON-LD format following the W3C Verifiable Credentials 2.0 structure.

**DEMO:** I can show a raw API call to the OB 3.0 endpoint and the JSON-LD response structure.

---

### 4.7 Credential Sharing & Verification

Students can generate **time-limited share links** for any credential:

1. Go to credential detail → click "Share"
2. A link is generated (default: 30 days expiry)
3. Anyone with the link can view the credential — no login needed
4. View count is tracked

There's also a **public verification page** (`/verify`) where anyone can paste or upload OB 3.0 JSON to verify its authenticity.

**DEMO:** Generate a share link and open it in an incognito window to show the public view.

---

### 4.8 Admin Panel

The admin panel has five tabs:

| Tab           | Function                                              |
|---------------|-------------------------------------------------------|
| Uploads       | Review & verify/reject student-uploaded certificates  |
| Announcements | View all certificate announcements                    |
| Users         | Create, view, delete user accounts                    |
| Moodle API    | Test connectivity to Moodle REST API                  |
| Audit Log     | View system activity log (logins, creates, deletes)   |

**DEMO:** Quick walkthrough of each tab.

---

### 4.9 Moodle Plugin (local_academic_wallet)

The Moodle plugin (v1.1.0) adds these capabilities to Moodle:

| Page                     | Purpose                                          |
|--------------------------|--------------------------------------------------|
| Search Student Credentials | Search wallet students, view their credentials  |
| Announce Certificate     | Broadcast that a certificate is needed/available  |
| My Access Requests       | Track Flow 1 requests and read approved credentials |

Navigation is integrated into Moodle via:
- **Left sidebar** — 3 links (Search, Announce, My Requests)
- **Top navbar** — "Announce Certificate" quick-access button

Plugin settings are configurable under Site Administration:
- Wallet API URL (default: `http://host.docker.internal:4000`)
- API Key (default: `moodle-api-key-2024`)

**DEMO:** Show Moodle sidebar with all three links and the navbar button.

---

## 5. Credential Structure — OB 3.0 Compliance (2 min)

Every credential in the wallet follows the OB 3.0 / W3C VC 2.0 structure:

```json
{
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "did:web:fh-dortmund.de",
    "type": ["Profile"],
    "name": "FH Dortmund"
  },
  "issuanceDate": "2026-04-01T10:00:00Z",
  "credentialSubject": {
    "type": ["AchievementSubject"],
    "achievement": {
      "type": ["Achievement"],
      "name": "German Language B2",
      "description": "B2 level proficiency in German language",
      "criteria": { "narrative": "Pass B2 exam with 60%+" }
    }
  }
}
```

This structure is used consistently across:
- The credential storage
- The OB 3.0 API responses (`/ims/ob/v3p0/credentials`)
- The shared credential public view
- The verification endpoint
- The Moodle plugin credential viewer (with JSON-LD toggle)

---

## 6. Security Measures (1 min)

| Measure                     | Implementation                                    |
|-----------------------------|---------------------------------------------------|
| Authentication              | JWT tokens (24h expiry) for users                 |
| API Key auth                | `X-API-Key` header for external systems (Moodle)  |
| Password hashing            | bcrypt with salt                                  |
| Role-based access           | Middleware checks role on every protected route    |
| Consent-based sharing       | Students explicitly approve/deny each request     |
| Token expiry                | Access tokens expire after 7 days                 |
| Revocable access            | Students can revoke granted access at any time     |
| Share link expiry           | Shared credential links expire (default 30 days)  |
| CORS                        | Restricted to frontend origin                     |
| Moodle CSRF                 | sesskey validation on all form submissions        |
| Capability checks           | Moodle capability `viewcredentials` required       |

---

## 7. How to Run the Project (1 min)

The entire system can be started in 3 terminals:

```bash
# Terminal 1: Start Moodle (Docker)
cd openbadge
docker compose up -d

# Terminal 2: Start Wallet Backend
cd openbadge/academic-wallet/server
npm install && npm start          # http://localhost:4000

# Terminal 3: Start Wallet Frontend
cd openbadge/academic-wallet/client
npm install && npm run dev        # http://localhost:5173
```

First-time setup requires one additional command to install the Moodle database:
```bash
docker exec moodle-app php admin/cli/install_database.php \
  --adminpass="Admin1234!" --adminemail="admin@moodle.local" \
  --fullname="FH Dortmund - Open Badges Test" --shortname="FHD-OB" --agree-license
```

---

## 8. Summary of Deliverables

| Deliverable                          | Status |
|--------------------------------------|--------|
| Wallet Backend (Node.js/Express)     | ✅ Done |
| Wallet Frontend (React/Vite)         | ✅ Done |
| OB 3.0 Standard Endpoints           | ✅ Done |
| Moodle Docker Setup                  | ✅ Done |
| Moodle Plugin (local_academic_wallet)| ✅ Done |
| Flow 1: Consent-Based Credential Sharing | ✅ Done |
| Certificate Upload & Verification    | ✅ Done |
| Announcement System (Moodle → Wallet)| ✅ Done |
| Credential Sharing (time-limited links) | ✅ Done |
| Public Credential Verification       | ✅ Done |
| Admin Panel (users, uploads, audit)  | ✅ Done |
| Moodle Badge Import                  | ✅ Done |
| Role-Based Access Control            | ✅ Done |
| Documentation (README files)         | ✅ Done |

---

## 9. Live Demo Sequence (suggested order)

1. **Start all services** — show Docker, backend, frontend running
2. **Wallet Login** — login as student, show dashboard with stats
3. **Credentials page** — show existing OB 3.0 credentials with JSON-LD toggle
4. **Moodle Login** — login as admin, show sidebar links + navbar button
5. **Moodle Search** — search for "student", view Max Mustermann's credentials
6. **Flow 1 Demo** — request access from Moodle → approve in wallet → read credential in Moodle
7. **Announce from Moodle** — create announcement → show it appears in wallet
8. **Upload Certificate** — student uploads PDF → admin verifies → new OB 3.0 credential
9. **Share Credential** — generate share link, open in incognito
10. **Admin Panel** — show users, audit log, pending items
11. **OB 3.0 API** — show raw API response with proper JSON-LD structure

---

## 10. Questions & Discussion

Thank you. I'm happy to answer any questions, demonstrate specific features in more detail, or discuss the technical implementation choices.

---

*Project repository: `openbadge/` directory containing `academic-wallet/`, `moodle/`, and `docker-compose.yml`*
