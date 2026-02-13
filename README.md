# Auto-Polaris V2

**Automated Flight Data Intelligence for Brazos & Polaris Platforms.**

Auto-Polaris is a mission-critical automation suite that streamlines extraction, processing, and multi-channel notification of Level 3 flight safety events from Brazos Safety / Polaris Flight Data Services. It features a real-time tactical dashboard, automated evidence capture, Outlook draft generation, and WhatsApp alerting — all orchestrated through a single-click workflow.

---

## 🚀 Key Features

- **One-Click Workflow** — Scrape → Ingest → Capture → Draft → Notify, all triggered from the dashboard
- **Tactical Dashboard** — Glassmorphism-styled React UI with dark/light mode, real-time event grid, and live execution logs
- **Visual Evidence Capture** — Automatically captures PFD instrument and parameter table screenshots from Polaris graphs
- **Rich Email Drafts** — Generates HTML emails with embedded visuals, metadata, and event links; loads them directly into Outlook
- **WhatsApp Alerts** — Sends structured notifications via Twilio Content API or sandbox fallback
- **Smart Status Sync** — Events track through `NEW → EVIDENCE_READY → DRAFTED → NOTIFIED → CLOSED` lifecycle
- **Zero-Result Handling** — Workflow gracefully handles empty Polaris results and auto-closes completed events
- **Local-First Architecture** — SQLite database with no cloud dependency; all processing happens on-device

---

## 🏗️ Architecture

### 4-Level Separation of Concerns

```
Auto_Polaris/
├── GEMINI.md                    # Level 1: Command — Mission & principles
├── ops/                         # Level 2: Operations — SOPs & procedures
│   ├── ingest_csv.js            #   CSV → SQLite ingestion with status sync
│   ├── setup_database.js        #   Database schema initialization
│   ├── migrate_add_modified.js  #   Schema migration utility
│   └── verify_modified.js       #   Migration verification
├── resources/                   # Level 3: Resources — Executable scripts
│   ├── brazos_workflow.spec.ts  #   Polaris scraper (Playwright)
│   ├── notification_generator.spec.ts  # Evidence capture
│   ├── outlook_draft_generator.spec.ts # Outlook automation
│   └── whatsapp_twilio_sender.ts       # Twilio WhatsApp sender
├── env/                         # Level 4: Environment — Configs & infra
│   ├── .env                     #   Credentials (gitignored)
│   ├── tmp/                     #   Temporary processing files
│   └── logs/                    #   Execution logs
├── server/                      # Bridge server (Express + Socket.io)
│   └── index.js
└── dashboard/                   # React tactical dashboard (Vite)
    └── src/
        ├── App.tsx              #   Main application shell
        ├── theme/               #   Theme context & Ant Design tokens
        └── components/          #   UI components
            ├── EventGrid.tsx    #     Red Alert Events table
            ├── ControlPanel.tsx #     Workflow trigger & status
            ├── TerminalLogs.tsx #     Live execution log viewer
            ├── WhatsAppSetup.tsx#     Sandbox handshake manager
            ├── IngestionHistory.tsx # CSV import history
            └── NotificationLogs.tsx# Email/WhatsApp delivery log
```

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD (React + Vite)                    │
│  localhost:5173 ──── Socket.io ──── Bridge Server :3001          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ run-full-workflow
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PIPELINE                              │
│                                                                   │
│  Phase 1: SCRAPE          Phase 2: INGEST                        │
│  brazos_workflow.spec.ts  ingest_csv.js                          │
│  Polaris → CSV            CSV → SQLite (status sync)             │
│           │                         │                             │
│           ▼                         ▼                             │
│  Phase 3: CAPTURE         Phase 4: DRAFT                         │
│  notification_generator   outlook_draft_generator                │
│  Polaris → Screenshots    HTML → Outlook Draft                   │
│           │                         │                             │
│           ▼                         ▼                             │
│  Phase 5: NOTIFY                                                 │
│  whatsapp_twilio_sender                                          │
│  Twilio → WhatsApp                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow Pipeline

### Phase 1: Polaris Event Extraction
- **Script**: `resources/brazos_workflow.spec.ts`
- **Action**: Logs into Polaris, navigates to Event Search, filters by fleet and Level 3 severity, exports matching events as CSV
- **Output**: `input_csvs/<timestamp>.csv`
- **Zero-Result Handling**: If no events match, exits cleanly with code 0; the server detects no new CSV and auto-closes any previously notified events

### Phase 2: Data Ingestion & Status Sync
- **Script**: `ops/ingest_csv.js`
- **Action**: Reads CSV, upserts flights and events into SQLite. Performs a status sweep: marks all events as `CLOSED`, then restores `PENDING` for events still in the CSV — ensuring events no longer in Polaris are automatically retired
- **Output**: Updated `auto_polaris.db`

### Phase 3: Evidence Capture
- **Script**: `resources/notification_generator.spec.ts`
- **Filters**: Only processes events with `analysis_status = 'NEW'`
- **Action**: Logs into Polaris, navigates to each event's flight graph, captures PFD instrument and tabular data screenshots, scrapes flight metadata, generates `email_draft.html`
- **Output**: `evidence_screenshots/<event_id>/` with `pfd.png`, `table.png`, `metadata.json`, `email_draft.html`
- **Status Update**: `NEW → EVIDENCE_READY`

### Phase 4: Outlook Draft Generation
- **Script**: `resources/outlook_draft_generator.spec.ts`
- **Filters**: Only processes events with `analysis_status = 'EVIDENCE_READY'`
- **Action**: Opens Outlook Web, creates a new mail, fills recipient (contact picker), subject, and injects pre-generated HTML body with PFD/table image attachments
- **Status Update**: `EVIDENCE_READY → DRAFTED`

### Phase 5: WhatsApp Notification
- **Script**: `resources/whatsapp_twilio_sender.ts`
- **Filters**: Only processes events with `analysis_status = 'DRAFTED'`
- **Action**: Sends structured WhatsApp messages via Twilio Content API (or sandbox body fallback) with event code, description, date, and Polaris link
- **Status Update**: `DRAFTED → NOTIFIED`

---

## 📊 Event Lifecycle

```
  NEW ──────► EVIDENCE_READY ──────► DRAFTED ──────► NOTIFIED
   │              (Phase 3)           (Phase 4)       (Phase 5)
   │
   └── polaris_status: PENDING ──────────────────────► CLOSED
         (still in Polaris)                     (validated/removed)
```

**Dashboard visibility**: Only events with `polaris_status = 'PENDING'` appear on the Red Alert Events board. Once an event is validated or removed from Polaris, it is automatically marked `CLOSED` and disappears from the active view.

**Re-run safety**: Each phase filters by `analysis_status`, so re-running the workflow on the same pending events will not duplicate notifications. Only truly `NEW` events flow through the full pipeline.

---

## 🖥️ Dashboard

The tactical dashboard provides real-time visibility into the workflow:

| Page | Description |
|------|-------------|
| **Mission Control** | Red Alert Events grid (active Level 3 events), Operation Control (run workflow), WhatsApp Sandbox manager, Live Execution Logs |
| **Ingestion History** | CSV import log with timestamps, file names, and row counts |
| **Notification Logs** | Full email and WhatsApp delivery history with event cross-references |

### Design System
- **Glassmorphism** — Frosted glass panels with backdrop-blur
- **Dark/Light Mode** — Toggle via header button, persisted in localStorage
- **Tactical Typography** — Inter for UI, JetBrains Mono for data/logs
- **Accent Palette** — Cyan/green accents (dark), blue accents (light)
- **Real-Time Updates** — Socket.io streams execution logs directly to the dashboard

---

## ⚙️ Setup & Installation

### Prerequisites
- **Node.js** v18+
- **Chromium** (installed via Playwright)
- **Twilio Account** (for WhatsApp notifications)
- **Microsoft Outlook Account** (for email draft generation)

### 1. Install Dependencies

```bash
# Root (server + Playwright scripts)
cd Auto_Polaris
npm install
npx playwright install chromium

# Dashboard
cd dashboard
npm install
```

### 2. Configure Environment

Create `env/.env` with the following variables:

```env
# Polaris / Brazos Credentials
BRAZOS_USERNAME=your_polaris_username
BRAZOS_PASSWORD=your_polaris_password

# Outlook Credentials
OUTLOOK_EMAIL=your_outlook_email
OUTLOOK_PASSWORD=your_outlook_password

# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=+14155238886
TWILIO_WHATSAPP_TO=whatsapp:+your_number
TWILIO_MESSAGING_SERVICE_SID=your_messaging_sid  # Optional
TWILIO_CONTENT_SID=your_content_template_sid      # Optional (for template messages)
```

### 3. Initialize Database

```bash
node ops/setup_database.js
```

### 4. Start the Application

```bash
# Terminal 1: Start the bridge server
node server/index.js
# → Server runs on http://localhost:3001

# Terminal 2: Start the dashboard
cd dashboard && npm run dev
# → Dashboard runs on http://localhost:5173
```

---

## 🚦 Running the Workflow

### From the Dashboard (Recommended)
Click **RUN WORKFLOW** on the Mission Control page. The workflow executes all 5 phases sequentially, streaming logs to the Live Execution Logs panel in real-time.

### Individual Phases (CLI)

```bash
# Phase 1: Scrape Polaris
npx playwright test resources/brazos_workflow.spec.ts --headed

# Phase 2: Ingest CSV data
node ops/ingest_csv.js

# Phase 3: Capture evidence screenshots
npx playwright test resources/notification_generator.spec.ts --headed

# Phase 4: Generate Outlook drafts
npx playwright test resources/outlook_draft_generator.spec.ts --headed

# Phase 5: Send WhatsApp notifications
npx ts-node --esm resources/whatsapp_twilio_sender.ts
```

---

## 🗄️ Database Schema

The SQLite database (`auto_polaris.db`) contains four tables:

| Table | Purpose |
|-------|---------|
| `flights` | Aircraft tail numbers, flight dates, departure times |
| `flight_events` | Level 3 events with polaris_ref (unique), status tracking, evidence paths |
| `data_imports` | CSV import history for deduplication |
| `notification_log` | Email/WhatsApp delivery audit trail |

### Key Fields on `flight_events`

| Field | Description |
|-------|-------------|
| `polaris_ref` | Unique Polaris event reference (e.g., `69010330`) |
| `analysis_status` | Workflow stage: `NEW` → `EVIDENCE_READY` → `DRAFTED` → `NOTIFIED` |
| `polaris_status` | Sync status: `PENDING` (active) or `CLOSED` (retired) |
| `evidence_path` | Path to captured screenshots directory |
| `modified_text` | Last modified timestamp from Polaris |

---

## 🛠️ Utility Scripts

| Script | Purpose |
|--------|---------|
| `debug_login.spec.ts` | Test Polaris login flow |
| `verify_login.spec.ts` | Verify credential validity |
| `find_selectors.spec.ts` | Map DOM selectors for platform updates |
| `explore_selectors.spec.ts` | Deep selector discovery |
| `check_twilio_status.ts` | Validate Twilio API connectivity |
| `process_events_offline.ts` | Offline event processing from JSON |

---

## 📂 Gitignored Paths

The following are generated locally and not committed:

- `env/.env` — Credentials
- `auto_polaris.db` — SQLite database
- `input_csvs/` — Raw CSV downloads
- `evidence_screenshots/` — Captured evidence
- `archive/` — Processed CSVs
- `node_modules/` — Dependencies
- `test-results/` / `playwright-report/` — Test artifacts

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Dashboard** | React 19, Vite 7, Ant Design 6, TypeScript |
| **Server** | Express 5, Socket.io 4, sql.js (WebAssembly SQLite) |
| **Automation** | Playwright (Chromium) |
| **Database** | SQLite (via sql.js, file-based) |
| **Notifications** | Twilio WhatsApp API, Outlook Web (Playwright) |
| **Styling** | CSS Custom Properties, Glassmorphism, Inter + JetBrains Mono fonts |

---

© 2026 Auto-Polaris Framework. All rights reserved.
