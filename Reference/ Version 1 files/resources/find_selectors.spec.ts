import { test } from '@playwright/test';
import * as fs from 'fs';

/**
 * Automated selector discovery for Brazos data filtering
 */
test('Find Brazos filter selectors', async ({ page }) => {
    const username = process.env.BRAZOS_USERNAME;
    const password = process.env.BRAZOS_PASSWORD;

    if (!username || !password) {
        throw new Error('Credentials not set');
    }

    let report = '';
    const log = (message: string) => {
        console.log(message);
        report += message + '\n';
    };

    log('=== AUTOMATED SELECTOR DISCOVERY ===\n');

    // Login
    log('1. Logging in...');
    await page.goto('https://brazos.flightdataservices.com');
    await page.fill('#id_login', username);
    await page.fill('#id_password', password);
    await page.click('button.ui-button:has-text("Login")');
    await page.waitForURL((url) => !url.href.includes('/accounts/login'));
    log('✓ Login successful\n');

    // Navigate to Events
    log('2. Navigating to Events section...');
    await page.click('a:has-text("Events")');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
        path: 'env/tmp/03-events-page.png',
        fullPage: true
    });
    log('✓ Screenshot: env/tmp/03-events-page.png\n');

    log('3. Analyzing page for filter elements...\n');
    log(`Current URL: ${page.url()}\n`);

    // Search for Fleet field
    log('--- FLEET FIELD ---');
    const fleetSelectors = [
        '#id_fleet',
        '[name="fleet"]',
        'select[id*="fleet"]',
        'input[id*="fleet"]',
        'select[name*="fleet"]',
        'input[name*="fleet"]'
    ];

    for (const selector of fleetSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
            const element = page.locator(selector).first();
            const tagName = await element.evaluate(el => el.tagName);
            const id = await element.getAttribute('id');
            const name = await element.getAttribute('name');
            log(`✓ FOUND: ${selector}`);
            log(`  Tag: ${tagName}, ID: ${id}, Name: ${name}\n`);
        }
    }

    // Search for Event Status field
    log('--- EVENT STATUS FIELD ---');
    const statusSelectors = [
        '#id_event_status',
        '[name="event_status"]',
        'select[id*="status"]',
        'select[name*="status"]'
    ];

    for (const selector of statusSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
            const element = page.locator(selector).first();
            const tagName = await element.evaluate(el => el.tagName);
            const id = await element.getAttribute('id');
            const name = await element.getAttribute('name');
            log(`✓ FOUND: ${selector}`);
            log(`  Tag: ${tagName}, ID: ${id}, Name: ${name}\n`);
        }
    }

    // Search for Event Validity field
    log('--- EVENT VALIDITY FIELD ---');
    const validitySelectors = [
        '#id_event_validity',
        '[name="event_validity"]',
        'select[id*="validity"]',
        'select[name*="validity"]'
    ];

    for (const selector of validitySelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
            const element = page.locator(selector).first();
            const tagName = await element.evaluate(el => el.tagName);
            const id = await element.getAttribute('id');
            const name = await element.getAttribute('name');
            log(`✓ FOUND: ${selector}`);
            log(`  Tag: ${tagName}, ID: ${id}, Name: ${name}\n`);
        }
    }

    // Search for Severity field
    log('--- SEVERITY FIELD ---');
    const severitySelectors = [
        '#id_severity',
        '[name="severity"]',
        'select[id*="severity"]',
        'input[id*="severity"]',
        'select[name*="severity"]',
        'input[name*="severity"]'
    ];

    for (const selector of severitySelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
            const element = page.locator(selector).first();
            const tagName = await element.evaluate(el => el.tagName);
            const id = await element.getAttribute('id');
            const name = await element.getAttribute('name');
            log(`✓ FOUND: ${selector}`);
            log(`  Tag: ${tagName}, ID: ${id}, Name: ${name}\n`);
        }
    }

    // Search for forms and their inputs
    log('--- ALL FORM FIELDS ---');
    const allInputs = await page.locator('input, select, textarea').all();
    log(`Found ${allInputs.length} form fields:\n`);

    for (let i = 0; i < Math.min(allInputs.length, 30); i++) {
        const input = allInputs[i];
        const tagName = await input.evaluate(el => el.tagName);
        const type = await input.getAttribute('type');
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        const placeholder = await input.getAttribute('placeholder');

        if (id || name) {
            log(`${i + 1}. ${tagName}${type ? `[${type}]` : ''}`);
            if (id) log(`   ID: ${id}`);
            if (name) log(`   Name: ${name}`);
            if (placeholder) log(`   Placeholder: ${placeholder}`);
            log('');
        }
    }

    // Take final screenshot
    await page.screenshot({
        path: 'env/tmp/04-final-analysis.png',
        fullPage: true
    });

    log('\n=== DISCOVERY COMPLETE ===');

    // Save report to file
    fs.writeFileSync('env/tmp/selector-report.txt', report);
    log('\n📄 Report saved to: env/tmp/selector-report.txt');
});
