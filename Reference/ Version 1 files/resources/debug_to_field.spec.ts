import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import 'dotenv/config';

test('Debug Outlook To field', async ({ page }) => {
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

    // Capture DOM of the compose area
    const composeDom = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('env/logs/compose_dom.html', composeDom);

    // Try finding the To field by label
    console.log('Searching for To field...');
    const toField = page.locator('div[aria-label="To"]').or(page.locator('div[role="textbox"][aria-label="To"]'));
    if (await toField.count() > 0) {
        console.log('To field found via aria-label');
        await toField.first().click();
        await page.keyboard.type('WestPac_FDM_Event_Notification', { delay: 100 });
        await page.waitForTimeout(2000);
        await page.keyboard.press('Enter');
    } else {
        console.log('To field not found via aria-label, trying Tab navigation');
        await page.keyboard.press('Tab');
        await page.keyboard.type('WestPac_FDM_Event_Notification', { delay: 100 });
        await page.waitForTimeout(2000);
        await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'env/logs/to_field_debug.png' });
});
