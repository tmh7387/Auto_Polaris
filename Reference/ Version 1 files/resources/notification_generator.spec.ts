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

interface EventGroup {
    [ref: string]: CsvRecord[];
}

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
    console.log(`Found ${events.length} event records.`);

    if (events.length === 0) {
        console.log('No events to process.');
        return;
    }

    // 3. Group Events by Reference
    const grouped: EventGroup = {};
    for (const event of events) {
        if (!grouped[event.Reference]) grouped[event.Reference] = [];
        grouped[event.Reference].push(event);
    }
    const references = Object.keys(grouped);
    console.log(`Grouped into ${references.length} unique flight references: ${references.join(', ')}`);

    // 4. Login to Polaris (sharing session)
    console.log('Logging in to Polaris...');
    await page.goto(`${CONFIG.polarisBaseUrl}/accounts/login/`);
    await page.fill('#id_login', username);
    await page.fill('#id_password', password);
    await page.click('button:has-text("Login")');
    await page.waitForURL(url => !url.href.includes('/accounts/login'));
    console.log('Login successful.');

    // 5. Process Each Group
    for (const ref of references) {
        try {
            await processEventGroup(page, ref, grouped[ref]);
        } catch (error) {
            console.error(`Failed to process group for flight ${ref}:`, error);
            await page.screenshot({ path: `env/logs/error_process_${ref}.png`, fullPage: true });
        }
    }
});

async function processEventGroup(page: any, ref: string, group: CsvRecord[]) {
    const eventDir = path.join(CONFIG.outputDir, ref);
    if (!fs.existsSync(eventDir)) fs.mkdirSync(eventDir, { recursive: true });

    console.log(`Processing Flight ${ref} (${group.length} events)...`);

    const results: any[] = [];

    // Navigate to Graph URL ONCE per flight
    const graphUrl = `${CONFIG.polarisBaseUrl}/flight/${ref}/graph/`;
    console.log(`Navigating to Base Graph: ${graphUrl}`);
    await page.goto(graphUrl);
    await page.waitForLoadState('networkidle');
    try {
        await page.waitForSelector('.item.event', { timeout: 30000 });
    } catch (e) {
        console.warn(`    Warning: No events (.item.event) found in sidebar for flight ${ref} after 30s.`);
        const sidebarHtml = await page.locator('#sidebar').innerHTML().catch(() => 'sidebar not found');
        console.log(`    Sidebar HTML snippet: ${sidebarHtml.substring(0, 500)}...`);
    }

    for (let i = 0; i < group.length; i++) {
        const event = group[i];
        console.log(`  Sub-event ${i + 1}/${group.length}: ${event.Code} - ${event['Event Short Desc']}`);

        // For debugging, log all events in sidebar
        const allSidebarEvents = await page.locator('.item.event').evaluateAll((els: HTMLElement[]) => els.map(el => el.textContent?.trim()));
        console.log(`    Available sidebar events: ${JSON.stringify(allSidebarEvents)}`);

        // 1. Locate and click event in sidebar
        const eventShortDesc = event['Event Short Desc'];
        const eventItem = page.locator(`.item.event:has-text("${eventShortDesc}")`).first();
        if (await eventItem.count() === 0) {
            console.warn(`    Warning: Event "${eventShortDesc}" not found in sidebar. Skipping.`);
            continue;
        }

        const eventId = await eventItem.getAttribute('data-key');

        // 2. Navigate to the specific event moment
        const specificUrl = `${graphUrl}#event=${eventId}`;
        await page.goto(specificUrl);
        await page.waitForLoadState('networkidle');

        // 3. Wait for the specific row to be selected in the table
        try {
            await page.waitForSelector('tr.selected', { timeout: 10000 });
        } catch (e) { }

        await page.waitForTimeout(3000); // Settle time

        const highlightedRow = page.locator('tr.selected, tr.event-row').first();
        if (await highlightedRow.count() > 0) {
            await highlightedRow.scrollIntoViewIfNeeded();
        }

        // 4. Capture Screenshots
        const pfdPath = path.join(eventDir, `pfd_${i + 1}.png`);
        const tablePath = path.join(eventDir, `table_${i + 1}.png`);
        await page.locator('#instruments').screenshot({ path: pfdPath });
        await page.locator('#tabularData').screenshot({ path: tablePath });

        const pfdBase64 = fs.readFileSync(pfdPath, { encoding: 'base64' });
        const tableBase64 = fs.readFileSync(tablePath, { encoding: 'base64' });

        // 5. Extract Metadata
        const rowValues = await highlightedRow.evaluate((row: any) => {
            const cells = Array.from(row.querySelectorAll('td'));
            return (cells as HTMLElement[]).map(td => td.textContent?.trim() || '');
        });
        const headers = await page.locator('#tabularData th').evaluateAll((ths: any) => {
            return (ths as HTMLElement[]).map(th => th.getAttribute('oldtitle') || th.textContent?.trim() || '');
        });
        const metadata = Object.fromEntries(headers.map((h: string, i: number) => [h, rowValues[i]]).filter(([h]: [string, string]) => h));

        const utcDate = new Date(event['Event Datetime']);
        const { localDateString, lightingCondition } = getEnrichedTime(utcDate);

        results.push({
            event,
            localDateString,
            lightingCondition,
            metadata,
            pfdBase64,
            tableBase64
        });
    }

    // 6. Generate Notification Content
    if (results.length === 0) return;

    const flightUrl = `${CONFIG.polarisBaseUrl}/flight/${ref}/`;
    const emailHtml = generateEmailHtml(results, flightUrl);
    const whatsappMsg = generateWhatsappMsg(results, flightUrl);

    fs.writeFileSync(path.join(eventDir, 'email_draft.html'), emailHtml);
    fs.writeFileSync(path.join(eventDir, 'whatsapp_draft.txt'), whatsappMsg);
    // Backward compatibility for outlook_draft_generator (save primary pfd/table)
    fs.copyFileSync(path.join(eventDir, 'pfd_1.png'), path.join(eventDir, 'pfd.png'));
    fs.copyFileSync(path.join(eventDir, 'table_1.png'), path.join(eventDir, 'table.png'));

    fs.writeFileSync(path.join(eventDir, 'metadata.json'), JSON.stringify({
        flightRef: ref,
        flightUrl,
        events: results.map(r => ({ ...r.event, localDateString: r.localDateString, lightingCondition: r.lightingCondition, metadata: r.metadata }))
    }, null, 2));

    console.log(`✓ Generated combined drafts for flight ${ref} (${results.length} events)`);
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

function generateEmailHtml(results: any[], url: string) {
    const first = results[0];
    const lighting = first.lightingCondition.toUpperCase();
    const eventList = results.map(r => `${r.event.Code} - ${r.event['Event Short Desc']}`).join(' and ');

    let htmlContent = `
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px;">
        <p>Hi WESTPAC FDM Team,</p>
        <p><strong>${lighting} EVENT</strong></p>
        <p>Brazos Safety has identified ${results.length > 1 ? results.length : ''} Level 3 event${results.length > 1 ? 's' : ''} – ${eventList}</p>
    `;

    results.forEach((res, index) => {
        const event = res.event;
        const metadata = res.metadata;
        const radAlt = metadata['Altitude Radio'] || '-';
        const airSpd = metadata['Airspeed'] || '-';
        const vertSpd = metadata['Vertical Speed'] || '-';

        let torqueLine = '';
        if (event.Code.startsWith('ETB')) {
            const tq1 = metadata['Eng (1) Torque'] || '-';
            const tq2 = metadata['Eng (2) Torque'] || '-';
            torqueLine = `<p>The lowest recorded engine torque was Eng(1) at ${tq1}%, Eng (2) at ${tq2}% , below 17% for ~ 3 seconds.</p>`;
        }

        htmlContent += `
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">
            <p><strong>${event['Event Short Desc']}</strong></p>
            <p>The aircraft is descending: ${radAlt} ft RAD Alt, ${airSpd} kts, ${vertSpd} fpm.</p>
            ${torqueLine}
            <p>The threshold for Level 3 ${event['Event Short Desc']} < ${event.Threshold}</p>
            
            <h3>Visual Evidence (PFD)</h3>
            <img src="data:image/png;base64,${res.pfdBase64}" style="width: 100%; max-width: 600px; border: 1px solid #ccc; display: block;" alt="PFD Screenshot">
            
            <h3>Parameter Table</h3>
            <img src="data:image/png;base64,${res.tableBase64}" style="width: 100%; max-width: 600px; border: 1px solid #ccc; display: block; margin-top: 10px;" alt="Table Screenshot">
        </div>
        `;
    });

    htmlContent += `
        <p style="margin-top: 20px;">The link to the event is below:<br>
        <a href="${url}">${url}</a></p>
        <p style="font-size: 0.9em; color: #666; margin-top: 20px;">This is an automated draft for review.</p>
    </body>
    </html>
    `;
    return htmlContent;
}

function generateWhatsappMsg(results: any[], url: string) {
    const first = results[0];
    const eventList = results.map(r => `${r.event.Code} - ${r.event['Event Short Desc']}`).join(' & ');

    const dateObj = new Date(first.event['Event Datetime']);
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    }).format(dateObj);

    return `Hi WESTPAC FDM Team,

Brazos Safety has identified ${results.length > 1 ? results.length : ''} Level 3 event${results.length > 1 ? 's' : ''} – ${eventList} - ${formattedDate}

The link to the event is below:
${url}`;
}
