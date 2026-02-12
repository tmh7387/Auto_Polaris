import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import initSqlJs from 'sql.js';

/**
 * CORE NOTIFICATION GENERATOR V2 (Local-First)
 * This script processes pending events from SQLite, captures visual evidence from Polaris,
 * and updates the database with evidence paths and new status.
 */

interface DBEvent {
    id: number;
    flight_id: number;
    polaris_ref: string;
    event_name: string;
    severity_level: string;
    parameter_value: string;
    analysis_status: string;
    tail_number: string;
    flight_date: string;
    departure_time: string;
}

const CONFIG = {
    dbPath: path.resolve('auto_polaris.db'),
    outputDir: path.resolve('evidence_screenshots'),
    timezone: 'Australia/Sydney',
    dayStartHour: 6,
    dayEndHour: 18,
    polarisBaseUrl: 'https://polaris.flightdataservices.com'
};

test('Generate notifications for pending events from DB', async ({ page }) => {
    // 1. Prepare Environment
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const username = process.env.BRAZOS_USERNAME;
    const password = process.env.BRAZOS_PASSWORD;
    if (!username || !password) throw new Error('Credentials not set in .env');

    // 2. Load Database and Query 'NEW' Events
    const SQL = await initSqlJs();
    if (!fs.existsSync(CONFIG.dbPath)) {
        throw new Error(`Database not found at ${CONFIG.dbPath}`);
    }
    const filebuffer = fs.readFileSync(CONFIG.dbPath);
    const db = new SQL.Database(filebuffer);

    console.log(`Querying pending events from ${CONFIG.dbPath}...`);
    const stmt = db.prepare(`
        SELECT fe.*, f.tail_number, f.flight_date, f.departure_time 
        FROM flight_events fe
        JOIN flights f ON fe.flight_id = f.id
        WHERE fe.analysis_status = 'NEW'
    `);

    const events: DBEvent[] = [];
    while (stmt.step()) {
        events.push(stmt.getAsObject() as unknown as DBEvent);
    }
    stmt.free();

    console.log(`Found ${events.length} events to process.`);

    if (events.length === 0) {
        console.log('No events to process.');
        db.close();
        return;
    }

    // 3. Login to Polaris
    console.log('Logging in to Polaris...');
    await page.goto(`${CONFIG.polarisBaseUrl}/accounts/login/`);
    await page.fill('#id_login', username);
    await page.fill('#id_password', password);
    await page.click('button:has-text("Login")');
    await page.waitForURL(url => !url.href.includes('/accounts/login'));
    console.log('Login successful.');

    // 4. Process Each Event
    for (const event of events) {
        try {
            await processEvent(page, event, db);
        } catch (error) {
            console.error(`Failed to process event ID ${event.id}:`, error);
        }
    }

    // 5. Save Database changes
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(CONFIG.dbPath, buffer);
    db.close();
    console.log('Database updated with processing results.');
    process.exit(0);
});

async function processEvent(page: any, event: DBEvent, db: any) {
    const eventId = event.id;
    const ref = event.polaris_ref;
    const eventDir = path.join(CONFIG.outputDir, eventId.toString());
    if (!fs.existsSync(eventDir)) fs.mkdirSync(eventDir, { recursive: true });

    console.log(`Processing Event ID ${eventId} (Ref: ${ref})...`);

    const eventTimeStr = `${event.flight_date} ${event.departure_time}`;
    const utcDate = new Date(eventTimeStr);
    const { localDateString, lightingCondition } = getEnrichedTime(utcDate);

    // Navigate to Graph URL
    const graphUrl = `${CONFIG.polarisBaseUrl}/flight/${ref}/graph/`;
    console.log(`Navigating to Base Graph: ${graphUrl}`);
    await page.goto(graphUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.item.event', { timeout: 20000 });

    // Find the specific event in the sidebar
    const eventName = event.event_name;
    console.log(`Locating event in sidebar: "${eventName}"`);

    const eventItem = page.locator(`.item.event:has-text("${eventName}")`).first();
    if (await eventItem.count() === 0) {
        throw new Error(`Event "${eventName}" not found in sidebar for flight ${ref}`);
    }

    const polarisEventId = await eventItem.getAttribute('data-key');
    console.log(`Found Polaris Event ID: ${polarisEventId}`);

    // Navigate to the specific event moment
    const specificUrl = `${graphUrl}#event=${polarisEventId}`;
    console.log(`Navigating to specific moment: ${specificUrl}`);
    await page.goto(specificUrl);
    await page.waitForLoadState('networkidle');

    // Settle time for rendering
    await page.waitForTimeout(3000);

    const highlightedRow = page.locator('tr.selected, tr.event-row').first();
    if (await highlightedRow.count() > 0) {
        await highlightedRow.scrollIntoViewIfNeeded();
    }

    // Capture Screenshots
    const pfdPath = path.join(eventDir, 'pfd.png');
    await page.locator('#instruments').screenshot({ path: pfdPath });

    const tablePath = path.join(eventDir, 'table.png');
    await page.locator('#tabularData').screenshot({ path: tablePath });

    console.log(`✓ Evidence captured for ${eventId} in ${eventDir}`);

    // Update DB status
    db.run(`
        UPDATE flight_events 
        SET analysis_status = 'EVIDENCE_READY', evidence_path = ? 
        WHERE id = ?
    `, [eventDir, eventId]);
}

function getEnrichedTime(utcDate: Date) {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: CONFIG.timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };
    const localDateString = new Intl.DateTimeFormat('en-AU', options).format(utcDate);

    const parts = new Intl.DateTimeFormat('en-US', { ...options, hour12: false }).formatToParts(utcDate);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const lightingCondition: 'Day' | 'Night' = (hour >= CONFIG.dayStartHour && hour < CONFIG.dayEndHour) ? 'Day' : 'Night';

    return { localDateString, lightingCondition };
}
