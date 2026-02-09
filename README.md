# Auto-Polaris

**Automated Flight Data Intelligence for Brazos & Polaris Platforms.**

Auto-Polaris is a mission-critical automation suite designed to streamline the extraction, analysis, and notification of flight data events for Brazos Flight Data Services. It bridges the gap between raw web data and actionable engineering intelligence by automating evidence capture and multi-channel notification workflows.

## 🚀 Key Features

- **End-to-End Automation**: From web-based data extraction to Outlook and WhatsApp notification delivery.
- **Visual Evidence Capture**: Automatically captures PFD and Parameter screenshots from the Polaris graph interface.
- **Rich Notifications**: Generates formatted HTML emails and WhatsApp messages with embedded visuals and metadata.
- **Offline Intelligence**: Enriches raw data with local timezone conversions (Sydney) and lighting condition analysis (Day/Night).
- **Robustness Layer**: Includes dedicated tools for selector discovery and UI stability testing to handle platform updates.

## 🏗️ 4-Level Architecture

The project adheres to a strict 4-level separation of concerns:

1.  **Level 1: Command (`GEMINI.md`)**: Core mission, personality, and operational principles.
2.  **Level 2: Operations (`/ops/`)**: Standard Operating Procedures (SOPs) and tactical guides.
3.  **Level 3: Resources (`resources/`)**: Executable scripts, Playwright test suites, and data processing logic.
4.  **Level 4: Environment (`/env/`)**: Infrastructure, local configurations (`.env`), temporary assets, and logs.

---

## 🔄 Core Workflow (The Pipeline)

The system operates as a 4-stage sequential pipeline:

### Stage 1: Polaris Event Extraction
- **Script**: `resources/brazos_workflow.spec.ts`
- **Output**: `resources/brazos_pending_events.csv`
- **Function**: Logs into Brazos, filters for specific fleets and Level 3 events, and exports the data.

### Stage 2: Evidence Capture & Draft Generation
- **Script**: `resources/notification_generator.spec.ts`
- **Output**: `env/assets/notifications/[EventRef]/`
- **Function**: Navigates to Polaris graph URLs, locates exact event moments, and captures instrument/tabular screenshots.

### Stage 3: Outlook Draft Automation
- **Script**: `resources/outlook_draft_generator.spec.ts`
- **Output**: Official Drafts in Outlook.
- **Function**: Injects captured HTML content and attachments into a new Outlook draft for final engineering review.

### Stage 4: WhatsApp Notification Delivery
- **Script**: `resources/whatsapp_twilio_sender.ts`
- **Output**: Multi-channel alert via Twilio API.
- **Function**: Sends a summary alert to designated WhatsApp contacts via the Twilio Business API.

---

## 🛠️ Utility Functions & Maintenance

Auto-Polaris includes several utility scripts for maintenance and debugging:

- **Selector Discovery**: `find_selectors.spec.ts`, `explore_selectors.spec.ts`, and `identify_flight_selectors.spec.ts` are used to map platform changes.
- **Connection Testing**: `check_twilio_status.ts` and `verify_login.spec.ts` validate infrastructure health.
- **Data Deep-Dive**: `process_events_offline.ts` provides a lightweight JSON-based alternative for local data enrichment.

---

## ⚙️ Setup & Execution

### Prerequisites
- Node.js (v18+)
- Twilio Account (for WhatsApp)
- Microsoft Outlook Account

### Installation
```powershell
npm install
npx playwright install chromium
```

### Configuration
Create `env/.env` with:
```env
BRAZOS_USERNAME=your_username
BRAZOS_PASSWORD=your_password
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
... (see REPLICATION_SOP.md for full list)
```

### Run Full Pipeline
Individual stages can be run using `npx playwright test resources/[script].spec.ts`.

---

## 🔮 Potential Upgrades

- [ ] **Headless Automation**: Transition to full headless mode for CI/CD integration.
- [ ] **AI-Driven Analysis**: Integrate LLMs to provide summarized "Event Summaries" based on the captured parameter metadata.
- [ ] **Dashboard Integration**: A lightweight React/Vite dashboard in `Level 4` to monitor pipeline status and browse historical captures.
- [ ] **Direct SMS Fallback**: Implementation of secondary SMS alerts for high-priority Level 3 events.
- [ ] **Auto-Recovery**: Automatic retry logic for session timeouts and selector failures.

---
© 2026 Auto-Polaris Framework. All rights reserved.
