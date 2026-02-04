import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

/**
 * CORE NOTIFICATION GENERATOR
 * This script processes pending events from CSV, captures visual evidence from Polaris,
 * and generates notification drafts (Email/WhatsApp) for user review.
 */

interface CsvRecord {
    Reference: string;
    Aircraft: string;
    Fleet: string;
    Level: string;
    'Event Short Desc': string;
    'Event Datetime': string;
    Threshold: string;
    Value: string;
    Code: string;
    [key: string]: string;
}

const CONFIG = {
    inputCsv: 'resources/brazos_pending_events.csv',
    outputDir: 'env/assets/notifications',
    timezone: 'Australia/Sydney',
    dayStartHour: 6,
    dayEndHour: 18,
    polarisBaseUrl: 'https://polaris.flightdataservices.com'
};

test('Generate notifications for pending events', async ({ page }) => {
    // 1. Prepare Environment
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const username = process.env.BRAZOS_USERNAME;
    const password = process.env.BRAZOS_PASSWORD;
    if (!username || !password) throw new Error('Credentials not set in .env');

    // 2. Parse CSV
    console.log(`Reading events from ${CONFIG.inputCsv}...`);
    const csvContent = fs.readFileSync(CONFIG.inputCsv, 'utf-8');
    const events = parseCsv(csvContent);
    console.log(`Found ${events.length} events to process.`);

    if (events.length === 0) {
        console.log('No events to process.');
        return;
    }

    // 3. Login to Polaris (sharing session)
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
            await processEvent(page, event);
        } catch (error) {
            console.error(`Failed to process event ${event.Reference}:`, error);
        }
    }
});

async function processEvent(page: any, event: CsvRecord) {
    const ref = event.Reference;
    const eventDir = path.join(CONFIG.outputDir, ref);
    if (!fs.existsSync(eventDir)) fs.mkdirSync(eventDir, { recursive: true });

    console.log(`Processing Event ${ref} (${event.Code})...`);

    // Determine Day/Night and Local Time
    const utcDate = new Date(event['Event Datetime']);
    const { localDateString, lightingCondition } = getEnrichedTime(utcDate);

    // Navigate to Graph URL
    const graphUrl = `${CONFIG.polarisBaseUrl}/flight/${ref}/graph/`;
    console.log(`Navigating to Base Graph: ${graphUrl}`);
    await page.goto(graphUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.item.event', { timeout: 20000 });

    // Find the specific event in the sidebar
    // We match by the Event Short Desc from CSV (e.g. "Eng Torque Low Below 300ft AGL")
    const eventShortDesc = event['Event Short Desc'];
    console.log(`Locating event in sidebar: "${eventShortDesc}"`);

    const eventItem = page.locator(`.item.event:has-text("${eventShortDesc}")`).first();
    if (await eventItem.count() === 0) {
        throw new Error(`Event "${eventShortDesc}" not found in sidebar for flight ${ref}`);
    }

    const eventId = await eventItem.getAttribute('data-key');
    console.log(`Found Event ID: ${eventId}`);

    // Navigate to the specific event moment
    const specificUrl = `${graphUrl}#event=${eventId}`;
    console.log(`Navigating to specific moment: ${specificUrl}`);
    await page.goto(specificUrl);
    await page.waitForLoadState('networkidle');

    // Wait for the specific row to be selected in the table
    try {
        await page.waitForSelector('tr.selected', { timeout: 10000 });
    } catch (e) {
        console.warn('Timed out waiting for tr.selected, continuing with first available row.');
    }

    await page.waitForTimeout(3000); // Settle time for rendering

    const highlightedRow = page.locator('tr.selected, tr.event-row').first();
    if (await highlightedRow.count() > 0) {
        await highlightedRow.scrollIntoViewIfNeeded();
    }

    // Capture Screenshots
    const pfdPath = path.join(eventDir, 'pfd.png');
    await page.locator('#instruments').screenshot({ path: pfdPath });

    const tablePath = path.join(eventDir, 'table.png');
    await page.locator('#tabularData').screenshot({ path: tablePath });

    // Read images as Base64 for embedding
    const pfdBase64 = fs.readFileSync(pfdPath, { encoding: 'base64' });
    const tableBase64 = fs.readFileSync(tablePath, { encoding: 'base64' });

    // Extract Parameters for metadata
    const rowValues = await highlightedRow.evaluate((row: any) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return (cells as HTMLElement[]).map(td => td.textContent?.trim() || '');
    });
    const headers = await page.locator('#tabularData th').evaluateAll((ths: any) => {
        return (ths as HTMLElement[]).map(th => th.getAttribute('oldtitle') || th.textContent?.trim() || '');
    });
    const metadata = Object.fromEntries(headers.map((h: string, i: number) => [h, rowValues[i]]).filter(([h]: [string, string]) => h));

    // Generate Notification Content
    const flightUrl = `${CONFIG.polarisBaseUrl}/flight/${ref}/`;
    const emailHtml = generateEmailHtml(event, localDateString, lightingCondition, metadata, pfdBase64, tableBase64, flightUrl);
    const whatsappMsg = generateWhatsappMsg(event, localDateString, lightingCondition, metadata, flightUrl);

    fs.writeFileSync(path.join(eventDir, 'email_draft.html'), emailHtml);
    fs.writeFileSync(path.join(eventDir, 'whatsapp_draft.txt'), whatsappMsg);
    fs.writeFileSync(path.join(eventDir, 'metadata.json'), JSON.stringify({ ...event, localDateString, lightingCondition, metadata, flightUrl }, null, 2));

    console.log(`✓ Generated drafts for ${ref} in ${eventDir}`);
}

function parseCsv(content: string): CsvRecord[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const record: any = {};
        headers.forEach((h, i) => record[h] = values[i] || '');
        return record as CsvRecord;
    }).filter(r => r.Reference);
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

function generateEmailHtml(event: CsvRecord, localDate: string, lighting: string, metadata: any, pfdBase64: string, tableBase64: string, url: string) {
    const radAlt = metadata['Altitude Radio'] || '-';
    const airSpd = metadata['Airspeed'] || '-';
    const vertSpd = metadata['Vertical Speed'] || '-';

    // Torque specific logic (if applicable)
    let torqueLine = '';
    if (event.Code.startsWith('ETB')) {
        const tq1 = metadata['Eng (1) Torque'] || '-';
        const tq2 = metadata['Eng (2) Torque'] || '-';
        torqueLine = `<p>The lowest recorded engine torque was Eng(1) at ${tq1}%, Eng (2) at ${tq2}% , below 17% for ~ 3 seconds.</p>`;
    }

    return `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px;">
        <p>Hi WESTPAC FDM Team,</p>
        <p><strong>${lighting.toUpperCase()} EVENT</strong></p>
        <p>BSS has identified Level 3 event - ${event.Code} - ${event['Event Short Desc']}</p>
        <p>The aircraft is descending: ${radAlt} ft RAD Alt, ${airSpd} kts, ${vertSpd} fpm.</p>
        ${torqueLine}
        <p>The threshold for Level 3 ${event['Event Short Desc']} < ${event.Threshold}</p>
        <p>The link to the event is below:<br>
        <a href="${url}">${url}</a></p>
        
        <h3>Visual Evidence (PFD)</h3>
        <img src="data:image/png;base64,${pfdBase64}" style="width: 100%; max-width: 600px; border: 1px solid #ccc; display: block;" alt="PFD Screenshot">
        
        <h3>Parameter Table</h3>
        <img src="data:image/png;base64,${tableBase64}" style="width: 100%; max-width: 600px; border: 1px solid #ccc; display: block; margin-top: 10px;" alt="Table Screenshot">
        
        <p style="font-size: 0.9em; color: #666; margin-top: 20px;">This is an automated draft for review.</p>
    </body>
    </html>
    `;
}

function generateWhatsappMsg(event: CsvRecord, localDate: string, lighting: string, metadata: any, url: string) {
    // Format date as "Jan 22, 2026"
    const dateObj = new Date(event['Event Datetime']);
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).format(dateObj);

    return `Hi WESTPAC FDM Team,

BSS has identified Level 3 event – ${event.Code} - ${event['Event Short Desc']} - ${formattedDate}

The link to the event is below:
${url}`;
}
