# Auto-Polaris

Automated data extraction and processing for Brazos Flight Data Services.

## Overview

Auto-Polaris is a specialized automation tool designed to streamline the extraction of flight data events from the Brazos platform and process them for downstream enrichment (e.g., local timezone conversion and lighting condition analysis).

## Architecture

The project follows a **4-Level Architecture** as defined in `GEMINI.md`:

1.  **Level 1: Command (`GEMINI.md`)**: High-level principles and project goals.
2.  **Level 2: Operations (`ops/`)**: Standard Operating Procedures and workflow guides.
3.  **Level 3: Resources (`resources/`)**: Executable scripts, Playwright tests, and data processing tools.
4.  **Level 4: Environment (`env/`)**: Configuration settings, API keys, logs, and temporary storage.

## Workflow

The system operates in three distinct phases:

### phase 1: Discovery & Identification
- Scripts like `find_selectors.spec.ts` and `explore_selectors.spec.ts` are used to map the Brazos web interface.
- This ensures the automation remains robust against UI changes.

### Phase 2: Data Extraction
- **File**: `resources/brazos_workflow.spec.ts`
- **Action**: Uses Playwright to:
    1. Login to `brazos.flightdataservices.com`.
    2. Navigate to the "Open Events" section.
    3. Apply filters (Fleet, Status, Validity, Severity).
    4. Export the results as a CSV file to `resources/brazos_pending_events.csv`.

### Phase 3: Offline Processing
- **File**: `resources/process_events_offline.ts`
- **Action**: 
    1. Reads the extracted CSV.
    2. Converts UTC timestamps to Sydney time (Australia/Sydney).
    3. Determines lighting conditions (Day/Night) based on local hours.
    4. Enriches the data with direct flight URLs.
    5. Outputs a structured log to `resources/event_processing_log.json`.

## Setup

1.  **Installation**:
    ```powershell
    npm install
    npx playwright install chromium
    ```

2.  **Environment Variables**:
    Create an `.env` file in the root directory (or use `env/.env` depending on your executor setup) with:
    ```env
    BRAZOS_USERNAME=your_username
    BRAZOS_PASSWORD=your_password
    ```

## Execution

### Run Data Extraction
```powershell
npm test resources/brazos_workflow.spec.ts
```

### Run Offline Processing
```powershell
npx ts-node resources/process_events_offline.ts
```

## Directory Structure

- `ops/`: Workflow instructions.
- `resources/`: Automation scripts and data files.
- `env/`: Temporary files, logs, and configuration.
- `env/tmp/`: Screenshots and intermediate debug data.
