import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

/**
 * OUTLOOK DRAFT GENERATOR - UI REFINED
 * This version uses precise UI interactions for the contact picker and subject line.
 */

const CONFIG = {
    notificationsDir: 'env/assets/notifications',
    outlookUrl: 'https://outlook.office365.com/mail/',
    recipientTo: 'WestPac_FDM_Event_Notification'
};

test('Create Outlook drafts for processed events', async ({ page }) => {
    const username = 'ahouston@brazossafety.com';
    const password = process.env.BRAZOS_PASSWORD;

    if (!username || !password) throw new Error('Outlook credentials not found in .env');

    const eventDirs = fs.readdirSync(CONFIG.notificationsDir)
        .filter(f => fs.statSync(path.join(CONFIG.notificationsDir, f)).isDirectory());

    console.log(`Found ${eventDirs.length} events to draft.`);

    // Login
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

    await page.getByRole('button', { name: /New mail/i }).waitFor({ timeout: 60000 });
    console.log('Inbox loaded.');

    for (const ref of eventDirs) {
        try {
            await createDraft(page, ref);
            await page.waitForTimeout(5000);
            console.log(`✓ Draft finished for ${ref}`);
            // Use goto instead of reload for a cleaner state reset
            await page.goto(CONFIG.outlookUrl);
            await page.waitForTimeout(15000);
        } catch (error) {
            console.error(`Failed to create draft for ${ref}:`, error);
            await page.screenshot({ path: `env/logs/error_${ref}_ui.png` });
            await page.goto(CONFIG.outlookUrl);
            await page.waitForTimeout(15000);
        }
    }
});

async function createDraft(page: any, ref: string) {
    const eventDir = path.join(CONFIG.notificationsDir, ref);
    const metadataPath = path.join(eventDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) return;

    const metadataJson = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Handle both old and new metadata structure
    const eventList = metadataJson.events ? metadataJson.events : [metadataJson];
    const uniqueDescs = [...new Set(eventList.map((e: any) => e['Event Short Desc']))];
    const subject = `WESTPAC FDM LEVEL 3 - ${uniqueDescs.join(' and ')}`;

    console.log(`Creating draft: ${ref}`);

    // Ensure we are in a clean state by clicking Discard if an old compose window is open
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
    await page.waitForTimeout(5000);

    // 1. Open Contact Picker
    console.log('Opening Contact Picker...');
    await page.getByRole('button', { name: 'To', exact: true }).first().click();
    await page.waitForTimeout(4000);

    // 2. Navigate to Contacts and Select
    try {
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
        console.log('Picker interaction failed, closing modal...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        // Fallback: Type manually
        console.log('Trying manual entry fallback...');
        const toBox = page.locator('div[role="textbox"][aria-label="To"]');
        if (await toBox.count() > 0) {
            await toBox.fill(CONFIG.recipientTo);
        } else {
            await page.keyboard.press('Tab');
            await page.keyboard.type(CONFIG.recipientTo);
        }
        await page.keyboard.press('Tab');
    }
    await page.screenshot({ path: `env/logs/draft_${ref}_to_done.png` });

    // 3. Fill Subject
    console.log('Filling Subject...');
    const subjectBox = page.getByPlaceholder(/Add a subject/i);
    await subjectBox.click({ force: true });
    await page.waitForTimeout(500);
    await page.keyboard.type(subject, { delay: 50 });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // 4. Fill Body
    console.log('Injecting HTML Body...');
    const htmlDraft = fs.readFileSync(path.join(eventDir, 'email_draft.html'), 'utf-8');
    await page.evaluate(({ content }: { content: string }) => {
        const editor = document.querySelector('div[role="textbox"][aria-label="Message body"]') as HTMLElement | null ||
            document.querySelector('div[aria-label="Message body"]') as HTMLElement | null ||
            document.querySelector('.Editor') as HTMLElement | null;
        if (editor) {
            editor.innerHTML = content;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, { content: htmlDraft });
    await page.waitForTimeout(2000);

    // 5. Attachments - Capture all visual evidence files
    const allFiles = fs.readdirSync(eventDir);
    const evidenceFiles = allFiles.filter(f => f.startsWith('pfd_') || f.startsWith('table_'));

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
            await page.waitForTimeout(3000); // Wait for upload
        } catch (e) {
            console.log(`Failed to attach ${file}, skipping.`);
        }
    }

    await page.screenshot({ path: `env/logs/draft_${ref}_final_all.png` });
}
