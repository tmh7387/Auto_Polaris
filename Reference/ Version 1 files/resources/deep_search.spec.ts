import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import 'dotenv/config';

test('Deep element search', async ({ page }) => {
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
    await page.waitForTimeout(10000);

    // List all textboxes and buttons with their full paths/selectors
    const report = await page.evaluate(() => {
        const results: any[] = [];
        const processNode = (node: any, prefix = '') => {
            if (node.shadowRoot) {
                processNode(node.shadowRoot, prefix + '[shadow]');
            }
            if (node.tagName === 'IFRAME') {
                try {
                    processNode(node.contentDocument.body, prefix + '[iframe]');
                } catch (e) { }
            }

            const interactive = node.querySelectorAll ? Array.from(node.querySelectorAll('button, input, div[role="textbox"], div[contenteditable="true"]')) : [];
            interactive.forEach((el: any) => {
                results.push({
                    path: prefix,
                    tag: el.tagName,
                    role: el.getAttribute('role'),
                    label: el.getAttribute('aria-label'),
                    text: el.textContent?.trim().substring(0, 30),
                    id: el.id
                });
            });

            // recurse into children
            if (node.children) {
                Array.from(node.children).forEach(child => processNode(child, prefix));
            }
        };
        processNode(document.body);
        return results;
    });

    fs.writeFileSync('env/logs/deep_elements.json', JSON.stringify(report, null, 2));
    await page.screenshot({ path: 'env/logs/deep_elements.png', fullPage: true });
});
