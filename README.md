# Open Badges 3.0 — Academic Achievement Wallet + Moodle Integration

A complete system for issuing, storing, and sharing **Open Badges 3.0 (OB 3.0)** verifiable credentials between a **Moodle LMS** and a **student-controlled wallet**.

## System Overview

```
┌──────────────────────┐         ┌──────────────────────────┐
│    Moodle LMS        │         │  Academic Achievement    │
│    (Docker)          │  REST   │  Wallet                  │
│                      │◄───────►│                          │
│  Port 8080           │  API    │  Backend:  Port 4000     │
│  Plugin: academic_   │         │  Frontend: Port 5173     │
│          wallet      │         │                          │
└──────────────────────┘         └──────────────────────────┘
```

### Components

| Component            | Location               | Technology                    | Port  |
|----------------------|------------------------|-------------------------------|-------|
| Wallet Backend       | `academic-wallet/server`  | Node.js, Express           | 4000  |
| Wallet Frontend      | `academic-wallet/client`  | React, Vite, TailwindCSS   | 5173  |
| Moodle LMS           | `moodle/`                 | PHP (Docker container)      | 8080  |
| Moodle Plugin        | `moodle/local/academic_wallet` | PHP (Moodle local plugin) | —     |
| MariaDB              | Docker                    | MariaDB 10.11               | 3306  |

---

## Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **Docker Desktop** — [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Git** — [git-scm.com](https://git-scm.com)

---

## Full Setup (Step by Step)

### Step 1: Clone the repository

```bash
git clone <repository-url> openbadge
cd openbadge
```

Your directory structure should look like:
```
openbadge/
├── academic-wallet/       # Wallet app (Node.js + React)
├── moodle/                # Moodle source (mounted into Docker)
├── docker-compose.yml     # Moodle + MariaDB Docker config
└── README.md              # This file
```

### Step 2: Start Moodle (Docker)

```bash
cd openbadge
docker compose up -d
```

This starts two containers:
- **moodle-app** — Moodle PHP/Apache on port 8080
- **moodle-db** — MariaDB database

Wait ~30 seconds for the containers to initialize, then install the Moodle database:

```bash
docker exec moodle-app php admin/cli/install_database.php \
  --adminpass="Admin1234!" \
  --adminemail="admin@moodle.local" \
  --fullname="FH Dortmund - Open Badges Test" \
  --shortname="FHD-OB" \
  --agree-license
```

> **Note:** This only needs to be done once. The database persists in a Docker volume.

Install the Academic Wallet plugin:

```bash
docker exec moodle-app php admin/cli/upgrade.php --non-interactive
```

Verify Moodle is running: open **http://localhost:8080** in your browser.

#### Moodle Login

| Role  | Username | Password     |
|-------|----------|--------------|
| Admin | admin    | Admin1234!   |

### Step 3: Install and start the Wallet Backend

```bash
cd openbadge/academic-wallet/server
npm install
npm start
```

The server starts at **http://localhost:4000** and prints the demo accounts.

### Step 4: Install and start the Wallet Frontend

Open a **new terminal**:

```bash
cd openbadge/academic-wallet/client
npm install
npm run dev
```

The frontend starts at **http://localhost:5173**.

### Step 5: Verify everything works

Open these URLs in your browser:

| Service             | URL                                                      |
|---------------------|----------------------------------------------------------|
| Wallet Frontend     | http://localhost:5173                                     |
| Wallet API Health   | http://localhost:4000/api/health                         |
| Moodle LMS          | http://localhost:8080                                     |
| Moodle Plugin: Search | http://localhost:8080/local/academic_wallet/index.php  |
| Moodle Plugin: Announce | http://localhost:8080/local/academic_wallet/announce.php |
| Moodle Plugin: Requests | http://localhost:8080/local/academic_wallet/requests.php |

---

## Wallet Demo Accounts

| Role    | Email                    | Password    | What they can do                |
|---------|--------------------------|-------------|----------------------------------|
| Admin   | admin@wallet.local       | admin123    | Manage users, post announcements |
| Student | student@university.edu   | student123  | View/share credentials, approve access requests |
| Viewer  | viewer@company.com       | viewer123   | View shared credentials          |

---

## Using the Moodle Plugin

The **Academic Wallet** Moodle plugin (v1.1.0) lets professors search students, view OB 3.0 credentials, announce certificates, and track access requests — all from within Moodle.

### Navigation

After logging in, the following links appear in Moodle:

| Location        | Link                         | URL                                                     |
|-----------------|------------------------------|---------------------------------------------------------|
| Left sidebar    | Search Student Credentials   | `/local/academic_wallet/index.php`                      |
| Left sidebar    | Announce Certificate         | `/local/academic_wallet/announce.php`                   |
| Left sidebar    | My Access Requests           | `/local/academic_wallet/requests.php`                   |
| Top navbar      | Announce Certificate (button)| `/local/academic_wallet/announce.php`                   |

### Search Students

1. Login to Moodle as **admin** (http://localhost:8080)
2. Navigate to **Search Student Credentials** in the left sidebar
3. Type a student name, email, or ID in the search box (e.g., `student` or `Max`)
4. Click **Search** — results show students with their credential count
5. Click **View Credentials** to see a student's full OB 3.0 credentials

### Announce Certificates

Professors can broadcast certificate announcements to students:

1. Click **Announce Certificate** in the sidebar or the top navbar button
2. Fill in the form: achievement name, description, type, course ID, criteria, issuer
3. Click **Announce** — the announcement appears in the wallet frontend for students
4. Active announcements are listed at the bottom of the page

### Track Access Requests

Professors can monitor the status of all credential access requests:

1. Click **My Access Requests** in the sidebar
2. See a table of all requests with status (pending / approved / denied)
3. For approved requests, click **Read Credentials** to view the OB 3.0 credential
4. Toggle the JSON-LD view to inspect the raw verifiable credential

### Plugin Settings

Go to **Site administration → Plugins → Local plugins → Academic Wallet** to configure:

| Setting        | Default                              | Description                       |
|----------------|--------------------------------------|-----------------------------------|
| Wallet API URL | `http://host.docker.internal:4000`   | The wallet backend URL (from inside Docker) |
| API Key        | `moodle-api-key-2024`                | API key for authentication        |

> **`host.docker.internal`** is a Docker DNS name that resolves to the host machine. This allows the Moodle container to reach the wallet server running on your host.

---

## Flow 1: Consent-Based Credential Sharing

This is the main integration flow between Moodle and the Wallet:

```
┌───────────┐                    ┌───────────┐                    ┌───────────┐
│  Moodle   │                    │  Wallet   │                    │  Student  │
│ (Prof.)   │                    │  Server   │                    │  (Browser)│
└─────┬─────┘                    └─────┬─────┘                    └─────┬─────┘
      │                                │                                │
      │ 1. POST /wallet/access/request │                                │
      │  "Need German B2 cert"         │                                │
      │───────────────────────────────►│                                │
      │              201 Created       │                                │
      │◄───────────────────────────────│                                │
      │                                │                                │
      │                                │  2. GET /wallet/notifications  │
      │                                │◄───────────────────────────────│
      │                                │  "Moodle wants your cert"     │
      │                                │───────────────────────────────►│
      │                                │                                │
      │                                │  3. POST /wallet/access/grant  │
      │                                │◄───────────────────────────────│
      │                                │  → access_token (7-day)       │
      │                                │───────────────────────────────►│
      │                                │                                │
      │ 4. GET /ims/ob/v3p0/credentials│                                │
      │    Authorization: Bearer <token>                                │
      │───────────────────────────────►│                                │
      │    Signed OB 3.0 credential   │                                │
      │◄───────────────────────────────│                                │
      │                                │                                │
```

### Testing Flow 1

**From Moodle plugin (request):**
1. Search for a student and view their credentials
2. Use the "Request Access" form at the bottom of the credential view
3. Fill in credential type and message, click Send

**From Wallet frontend (approve):**
1. Login as `student@university.edu` / `student123`
2. Go to **Access Requests** in the sidebar
3. You'll see the pending request from Moodle
4. Click **Approve** to grant access (or **Deny** to reject)

**From Moodle plugin (read credentials):**
1. Go to **My Access Requests** in the Moodle sidebar
2. Approved requests show a **Read Credentials** button
3. Click it to view the OB 3.0 verifiable credential with JSON-LD

---

## Stopping Services

### Stop the Wallet

Press `Ctrl+C` in both terminal windows (backend and frontend).

### Stop Moodle

```bash
cd openbadge
docker compose down
```

To also delete the database volume (full reset):

```bash
docker compose down -v
```

---

## Starting Services Again (after first setup)

After the initial setup, you only need to run:

```bash
# Terminal 1: Start Moodle
cd openbadge
docker compose up -d

# Terminal 2: Start Wallet Backend
cd openbadge/academic-wallet/server
npm start

# Terminal 3: Start Wallet Frontend
cd openbadge/academic-wallet/client
npm run dev
```

---

## Troubleshooting

| Problem                              | Solution                                                                 |
|--------------------------------------|--------------------------------------------------------------------------|
| Port 4000 already in use             | Kill the process: `npx kill-port 4000` or find PID with `netstat -ano \| findstr :4000` |
| Port 8080 already in use             | Stop other services or change the port in `docker-compose.yml`          |
| Moodle shows "Database not set up"   | Run the `install_database.php` command from Step 2                       |
| Plugin not visible in Moodle         | Run `docker exec moodle-app php admin/cli/upgrade.php --non-interactive` |
| Moodle plugin says "URL blocked"     | The `wallet_api.php` uses `ignoresecurity` — ensure the file is up to date |
| `Class "curl" not found` in Moodle   | The `wallet_api.php` must include `require_once($CFG->libdir . '/filelib.php')` |
| Docker containers won't start        | Run `docker compose down` then `docker compose up -d`                    |
| Frontend can't reach backend         | Backend must be on port 4000; Vite proxy is configured in `vite.config.js` |

---

## Technology Stack

- **Backend**: Node.js, Express, JWT, flat-file JSON DB
- **Frontend**: React 19, Vite 6, TailwindCSS 4, Axios, Lucide icons
- **Moodle**: v4.5+ (moodlehq/moodle-php-apache:8.3 Docker image)
- **Database**: MariaDB 10.11 (for Moodle), flat-file JSON (for Wallet)
- **Standard**: Open Badges 3.0 / W3C Verifiable Credentials 2.0
