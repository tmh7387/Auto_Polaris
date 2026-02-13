import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import initSqlJs from 'sql.js';

/**
 * OUTLOOK DRAFT GENERATOR V2 (Refactored to match V1 Logic)
 * Incorporates robust V1 selectors (Contact Picker), state management (Discard Drafts),
 * and dynamic attachments while maintaining V2 DB integration.
 */

interface DBEvent {
    id: number;
    flight_id: number;
    polaris_ref: string;
    event_name: string;
    severity_level: string;
    parameter_value: string;
    analysis_status: string;
    evidence_path: string;
    tail_number: string;
    flight_date: string;
    departure_time: string;
    event_code: string;
    threshold_value: string;
}

const CONFIG = {
    dbPath: path.resolve('auto_polaris.db'),
    outlookUrl: 'https://outlook.office365.com/mail/',
    recipientTo: 'WestPac_FDM_Event_Notification',
    polarisBaseUrl: 'https://polaris.flightdataservices.com'
};

test('Create Outlook drafts from DB events', async ({ page }) => {
    const username = process.env.OUTLOOK_EMAIL;
    const password = process.env.OUTLOOK_PASSWORD;

    if (!username || !password) {
        throw new Error('Outlook credentials (OUTLOOK_EMAIL, OUTLOOK_PASSWORD) not found in .env');
    }

    // 1. Load Database and Query 'EVIDENCE_READY' Events
    const SQL = await initSqlJs();
    if (!fs.existsSync(CONFIG.dbPath)) {
        throw new Error(`Database not found at ${CONFIG.dbPath}`);
    }
    const filebuffer = fs.readFileSync(CONFIG.dbPath);
    const db = new SQL.Database(filebuffer);

    console.log(`Querying EVIDENCE_READY events from ${CONFIG.dbPath}...`);
    const stmt = db.prepare(`
        SELECT fe.*, f.tail_number, f.flight_date, f.departure_time 
        FROM flight_events fe
        JOIN flights f ON fe.flight_id = f.id
        WHERE fe.analysis_status = 'EVIDENCE_READY'
    `);

    const events: DBEvent[] = [];
    while (stmt.step()) {
        events.push(stmt.getAsObject() as unknown as DBEvent);
    }
    stmt.free();

    console.log(`Found ${events.length} events to draft.`);

    if (events.length === 0) {
        console.log('No events to process.');
        db.close();
        return;
    }

    // 2. Login to Outlook (V1 Style)
    console.log(`Logging in to Outlook as ${username}...`);
    await page.goto(CONFIG.outlookUrl);
    await page.fill('input[type="email"]', username);
    await page.click('input[type="submit"]');
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.fill('input[type="password"]', password);
    await page.click('input[type="submit"]');
    try {
        const stayBtn = page.locator('input#idSIButton9, input[value="Yes"]');
        await stayBtn.waitFor({ timeout: 10000 });
        await stayBtn.click();
    } catch (e) { }

    // Wait generously for inbox (V1 uses 60s timeout)
    await page.getByRole('button', { name: /New mail/i }).waitFor({ timeout: 60000 });
    console.log('Inbox loaded.');

    // 3. Process Each Event
    for (const event of events) {
        try {
            await createDraft(page, event);
            console.log(`✓ Draft finished for Event ID ${event.id}`);

            // Update DB status and Log
            db.run("UPDATE flight_events SET analysis_status = 'DRAFTED' WHERE id = ?", [event.id]);
            db.run(`
                INSERT INTO notification_log (event_id, channel, status) 
                VALUES (?, 'EMAIL', 'DRAFTED')
            `, [event.id]);

            // V1 Logic: Refresh page to clear state for next iteration
            await page.goto(CONFIG.outlookUrl);
            await page.waitForTimeout(10000);

        } catch (error) {
            console.error(`Failed to create draft for Event ID ${event.id}:`, error);
            // Capture error screenshot
            await page.screenshot({ path: `env/logs/error_draft_${event.id}.png` });
            await page.goto(CONFIG.outlookUrl);
            await page.waitForTimeout(10000);
        }
    }

    // 4. Save Database changes
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(CONFIG.dbPath, buffer);
    db.close();
    console.log('Database updated with DRAFTED status.');
    process.exit(0);
});


async function createDraft(page: any, event: DBEvent) {
    const eventDir = event.evidence_path;
    const ref = event.polaris_ref;
    const subject = `WESTPAC FDM LEVEL 3 - ${event.event_name}`;

    console.log(`Creating draft for Event ID ${event.id} (Ref: ${ref})`);

    // V1 Logic: Ensure clean state by discarding old drafts
    try {
        const discardBtn = page.getByRole('button', { name: /Discard/i }).first();
        if (await discardBtn.isVisible()) {
            console.log('Closing old compose window...');
            await discardBtn.click();
            await page.waitForTimeout(2000);
            const confirmDiscard = page.getByRole('button', { name: /OK/i }).or(page.getByRole('button', { name: /Discard/i }));
            if (await confirmDiscard.isVisible()) await confirmDiscard.click();
        }
    } catch (e) { }

    // New Mail
    await page.getByRole('button', { name: /New mail/i }).first().click();
    await page.waitForTimeout(5000); // V1 used 5s wait

    // 1. Fill Recipient (V1 Contact Picker Logic)
    console.log('Opening Contact Picker...');
    try {
        await page.getByRole('button', { name: 'To', exact: true }).first().click();
        await page.waitForTimeout(4000);

        console.log('Selecting Contacts tab...');
        await page.getByText('Contacts', { exact: true }).first().click();
        await page.waitForTimeout(2000);

        console.log(`Selecting ${CONFIG.recipientTo}...`);
        await page.getByText(CONFIG.recipientTo, { exact: true }).first().click();
        await page.waitForTimeout(1000);

        console.log('Clicking Save...');
        await page.getByRole('button', { name: 'Save' }).first().click();
        await page.waitForTimeout(2000);
    } catch (e) {
        console.log('Picker interaction failed, falling back to manual entry...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);

        // V1 Fallback Logic
        const toBox = page.locator('div[role="textbox"][aria-label="To"]');
        if (await toBox.count() > 0) {
            await toBox.fill(CONFIG.recipientTo);
        } else {
            await page.keyboard.press('Tab');
            await page.keyboard.type(CONFIG.recipientTo);
        }
        await page.keyboard.press('Tab');
    }
    await page.waitForTimeout(1000);

    // 2. Fill Subject (V1 Typing Logic)
    console.log('Filling Subject...');
    const subjectBox = page.getByPlaceholder(/Add a subject/i);
    await subjectBox.click({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type(subject, { delay: 50 }); // V1 typed with delay for reliability
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // 3. Fill Body (V1 Logic: read pre-generated email_draft.html)
    console.log('Injecting HTML Body...');
    const htmlDraftPath = path.join(eventDir, 'email_draft.html');
    if (fs.existsSync(htmlDraftPath)) {
        const htmlDraft = fs.readFileSync(htmlDraftPath, 'utf-8');
        await page.evaluate(({ content }: { content: string }) => {
            const editor = document.querySelector('div[role="textbox"][aria-label="Message body"]') as HTMLElement | null ||
                document.querySelector('div[aria-label="Message body"]') as HTMLElement | null ||
                document.querySelector('.Editor') as HTMLElement | null;
            if (editor) {
                editor.innerHTML = content;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, { content: htmlDraft });
    } else {
        console.warn(`⚠️ No email_draft.html found at ${htmlDraftPath}`);
    }
    await page.waitForTimeout(2000);

    // 4. Attachments (V1 Dynamic Logic)
    if (fs.existsSync(eventDir)) {
        const allFiles = fs.readdirSync(eventDir);
        // V1 looked for pfd_ and table_, we adapt to support both V1 style and simple names
        const evidenceFiles = allFiles.filter(f =>
            f.startsWith('pfd') || f.startsWith('table') || f.endsWith('.png')
        );

        for (const file of evidenceFiles) {
            const filePath = path.resolve(path.join(eventDir, file));
            console.log(`Attaching ${file}...`);
            try {
                const [fileChooser] = await Promise.all([
                    page.waitForEvent('filechooser'),
                    page.getByRole('button', { name: /Attach/i }).first().click().then(() =>
                        page.getByRole('menuitem', { name: /Browse this computer/i }).or(page.locator('button:has-text("Browse this computer")')).first().click()
                    )
                ]);
                await fileChooser.setFiles(filePath);
                await page.waitForTimeout(5000); // V1 wait for upload
            } catch (e) {
                console.log(`Failed to attach ${file}, skipping.`);
            }
        }
    }
}
