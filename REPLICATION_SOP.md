# SOP: Polaris Event Notification System Replication

This document provides step-by-step instructions for replicating the automated flight event notification workflow on a new system.

## 1. Prerequisites
- **Node.js** (v18 or higher)
- **Git**
- **Playwright** (for browser automation)
- **Twilio Account** (with WhatsApp Business API or Sandbox active)
- **Microsoft Outlook Account** (accessible via web)

## 2. Environment Setup
1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd Auto_Polaris
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    npx playwright install
    ```
3.  **Configure Environment Variables**:
    Create a file at `env/.env` with the following variables:
    ```env
    BRAZOS_USERNAME=your_username
    BRAZOS_PASSWORD=your_password
    TWILIO_ACCOUNT_SID=your_sid
    TWILIO_AUTH_TOKEN=your_token
    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Your Twilio number
    TWILIO_WHATSAPP_TO=whatsapp:+66...         # Recipient number
    TWILIO_CONTENT_SID=HX...                    # Approved Template SID
    ```

## 3. Workflow Execution Steps
The complete pipeline consists of four sequential stages:

### Stage 1: Polaris Event Extraction
Run the extraction script to download the latest "Pending Level 3" events from Brazos.
```bash
npx playwright test resources/brazos_workflow.spec.ts --headed
```
*Output: `resources/brazos_pending_events.csv`*

### Stage 2: Evidence Capture & Draft Generation
Process the CSV to capture PFD/Parameter screenshots from Polaris and generate local drafts.
```bash
npx playwright test resources/notification_generator.spec.ts --headed
```
*Output: Files in `env/assets/notifications/[EventRef]/`*

### Stage 3: Outlook Draft Automation
Create official Outlook drafts with embedded visuals and correct recipients.
```bash
npx playwright test resources/outlook_draft_generator.spec.ts --headed
```
*Output: Drafts created in the "Drafts" folder of your Outlook account.*

### Stage 4: WhatsApp Notification Delivery
Send the notification summary to the pre-configured WhatsApp number.
```bash
npx tsx resources/whatsapp_twilio_sender.ts
```
*Output: Delivery confirmation with Twilio SIDs.*

## 4. Maintenance & Support
- **Timeouts**: If a script fails due to a timeout, ensure the network is stable and retry the specific stage.
- **WhatsApp Session**: If using the Sandbox, ensure the recipient has sent the `join` keyword to the Twilio number within the last 24 hours. If using Production Templates, no manual action is required.
- **Contact Selection**: Ensure the recipient contact `WestPac_FDM_Event_Notification` is saved in the Outlook account's contact list.
