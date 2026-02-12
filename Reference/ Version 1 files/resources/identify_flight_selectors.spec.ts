import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

/**
 * Script to identify selectors for PFD and data tables on Polaris
 */
test('Identify Polaris notification selectors', async ({ page }) => {
    // Load credentials from environment
    const username = process.env.BRAZOS_USERNAME;
    const password = process.env.BRAZOS_PASSWORD;

    if (!username || !password) {
        throw new Error('BRAZOS_USERNAME and BRAZOS_PASSWORD must be set in .env');
    }

    console.log('Logging in to Polaris...');
    await page.goto('https://polaris.flightdataservices.com/accounts/login/');
    await page.fill('#id_login', username);
    await page.fill('#id_password', password);
    await page.click('button:has-text("Login")');
    await page.waitForURL((url) => !url.href.includes('/accounts/login'));
    console.log('Login successful');

    // Example Flight + Graph URL provided by user
    const flightId = '68634752';
    const eventId = '290095494';
    const graphUrl = `https://polaris.flightdataservices.com/flight/${flightId}/graph/#event=${eventId}`;

    console.log(`Navigating to Graph URL: ${graphUrl}`);
    await page.goto(graphUrl);
    await page.waitForLoadState('networkidle');

    // Wait for the graph/parameters to load
    console.log('Waiting for elements to appear...');
    await page.waitForSelector('#instruments canvas.pfd', { timeout: 15000 });
    await page.waitForSelector('tr.selected', { timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for animations/rendering to settle

    // 1. Capture PFD Screenshot
    const pfdElement = page.locator('#instruments');
    await pfdElement.screenshot({ path: 'env/tmp/extracted-pfd.png' });
    console.log('PFD screenshot captured.');

    // 2. Capture Parameter Table Screenshot (Cropped around highlighted row)
    const highlightedRow = page.locator('tr.selected');
    // Scroll to the row first
    await highlightedRow.scrollIntoViewIfNeeded();
    // We want the table area, but centered on the row
    const tabularData = page.locator('#tabularData');
    await tabularData.screenshot({ path: 'env/tmp/extracted-table.png' });
    console.log('Table screenshot captured.');

    // 3. Extract metadata from the highlighted row
    const rowData = await highlightedRow.evaluate((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map(td => td.textContent?.trim() || '');
    });

    // Extract headers to map values
    const headers = await page.locator('#tabularData th').evaluateAll((ths) => {
        return ths.map(th => th.getAttribute('oldtitle') || th.textContent?.trim() || '');
    });

    console.log('--- EXTRACTED DATA ---');
    headers.forEach((header, i) => {
        if (header && rowData[i]) {
            console.log(`${header}: ${rowData[i]}`);
        }
    });

    // Dump a small JSON for verification
    const extractedMetadata = {
        timestamp: rowData[0],
        values: Object.fromEntries(headers.map((h, i) => [h, rowData[i]]).filter(([h]) => h))
    };
    fs.writeFileSync('env/tmp/extracted-metadata.json', JSON.stringify(extractedMetadata, null, 2));

    console.log('Discovery complete.');
});
