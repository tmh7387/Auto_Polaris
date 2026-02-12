import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import 'dotenv/config';

test('List compose fields', async ({ page }) => {
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

    // List all buttons, inputs, and textboxes
    const elements = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('button, input, div[role="textbox"], div[contenteditable="true"]'));
        return items.map(el => ({
            tag: el.tagName,
            role: el.getAttribute('role'),
            label: el.getAttribute('aria-label'),
            placeholder: el.getAttribute('placeholder'),
            text: el.textContent?.trim().substring(0, 50)
        }));
    });

    fs.writeFileSync('env/logs/elements.json', JSON.stringify(elements, null, 2));
    await page.screenshot({ path: 'env/logs/elements_screenshot.png' });
});
