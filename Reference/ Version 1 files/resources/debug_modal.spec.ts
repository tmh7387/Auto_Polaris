import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import 'dotenv/config';

test('Debug Outlook Contact Picker Modal', async ({ page }) => {
    const username = 'ahouston@brazossafety.com';
    const password = process.env.BRAZOS_PASSWORD;

    await page.goto('https://outlook.office365.com/mail/');
    await page.fill('input[type="email"]', username);
    await page.click('input[type="submit"]');
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.fill('input[type="password"]', password);
    await page.click('input[type="submit"]');
    try {
        await page.click('input#idSIButton9, input[value="Yes"]', { timeout: 5000 });
    } catch (e) { }

    await page.getByRole('button', { name: /New mail/i }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: /New mail/i }).first().click();
    await page.waitForTimeout(5000);

    // Click "To" button
    console.log('Opening Contact Picker...');
    await page.getByRole('button', { name: /To/i }).first().click();
    await page.waitForTimeout(5000);

    // Capture DOM of the modal
    const modalDom = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('env/logs/modal_dom.html', modalDom);
    await page.screenshot({ path: 'env/logs/modal_debug.png' });

    // Try to find the contact in the modal
    console.log('Searching for contact in modal...');
    const searchBox = page.getByPlaceholder(/Search people/i).or(page.locator('input[aria-label="Search people"]'));
    if (await searchBox.count() > 0) {
        await searchBox.fill('WestPac_FDM_Event_Notification');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'env/logs/modal_search_done.png' });
    }
});
