import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';

/**
 * Brazos Flight Data Services - Data Extraction Workflow
 * 
 * This script automates the login, navigation, and data filtering process
 * on polaris.flightdataservices.com
 */

// Configuration - Move to .env file
const CONFIG = {
    baseUrl: 'https://polaris.flightdataservices.com',
    credentials: {
        username: process.env.BRAZOS_USERNAME || '',
        password: process.env.BRAZOS_PASSWORD || ''
    },
    filters: {
        fleet: 'WH1-AW139',
        eventStatus: ['Open', 'In Progress'],
        eventValidity: ['Pending'],
        severity: '3'
    }
};

/**
 * Modular login function
 * Handles authentication to the Brazos platform
 */
async function login(page: Page) {
    console.log('Navigating to login page...');
    await page.goto(CONFIG.baseUrl);

    // Check if already logged in (redirected to dashboard)
    if (!page.url().includes('/accounts/login')) {
        console.log('Already logged in, skipping login form.');
        return;
    }

    // Attempt automated login if credentials exist
    if (CONFIG.credentials.username && CONFIG.credentials.password) {
        console.log('Attempting automated login...');
        await page.fill('#id_login', CONFIG.credentials.username);
        await page.fill('#id_password', CONFIG.credentials.password);

        // Use a non-blocking click for the login button to handle cases where 
        // the site triggers navigation in a way that Playwright's default click-wait stalls
        await page.click('button.ui-button:has-text("Login")', { noWaitAfter: true });
        console.log('Login button clicked. Waiting for navigation...');
    } else {
        console.log('No credentials provided in .env - Waiting for manual login...');
    }

    // Monitor for success or failure
    try {
        // Wait for redirect away from login - using a longer timeout and commit state
        await page.waitForURL((url) => !url.href.includes('/accounts/login'), {
            timeout: 45000,
            waitUntil: 'commit'
        });
        console.log('Login successful');
    } catch (e) {
        const lockoutText = await page.textContent('body');
        if (lockoutText?.toLowerCase().includes('temporarily locked out') || page.url().includes('/accounts/login')) {
            console.log('\n⚠️ ACTION REQUIRED: Automated login failed or account flagged.');
            console.log('The browser window is open. Please:');
            console.log('1. Log in manually in the browser.');
            console.log('2. Solve any CAPTHCAs if they appear.');
            console.log('3. Navigation will continue automatically once you reach the dashboard.\n');

            // Wait indefinitely (well, 5 mins) for the user to reach any page that isn't login
            await page.waitForURL((url) => !url.href.includes('/accounts/login'), { timeout: 300000 });
            console.log('Login detected (Manual/Semi-automated). Proceeding...');
        } else {
            throw e;
        }
    }
}

/**
 * Navigate to the events/data extraction section
 */
async function navigateToEvents(page: Page) {
    console.log('Navigating to Open Events search page...');

    // Navigate directly to the Open Events search page
    await page.goto('https://polaris.flightdataservices.com/event/search/open/');
    // Wait for the main filter input instead of networkidle
    await page.waitForSelector('#id_fleet', { state: 'visible', timeout: 60000 });

    console.log('Navigation complete');
}

/**
 * Apply filters for event search
 */
async function applyFilters(page: Page) {
    console.log('Applying filters...');

    // Fleet filter (autocomplete input)
    console.log(`Setting fleet filter: ${CONFIG.filters.fleet}`);
    await page.fill('#id_fleet', CONFIG.filters.fleet);
    // Wait for autocomplete and click first option (more robust than Enter)
    try {
        await page.waitForSelector('.ui-autocomplete .ui-menu-item', { state: 'visible', timeout: 3000 });
        await page.click('.ui-autocomplete .ui-menu-item:first-child');
    } catch (e) {
        console.log('Autocomplete menu did not appear or timed out, trying Enter');
        await page.press('#id_fleet', 'Enter');
    }

    // Event Status filter (multi-select)
    // Values: OPEN, IN_PROGRESS, CLOSED
    console.log(`Setting event status: ${CONFIG.filters.eventStatus.join(', ')}`);
    const statusValues = CONFIG.filters.eventStatus.map(s => s.toUpperCase().replace(' ', '_'));
    await page.selectOption('#id_status', statusValues);

    // Event Validity filter (multi-select)
    console.log(`Setting event validity to strictly: PENDING`);
    // Clear selections first to be safe
    await page.selectOption('#id_validity', []);
    // Select ONLY 'PENDING'
    await page.selectOption('#id_validity', ['PENDING']);

    // Verify selection (for debug)
    const selectedValidity = await page.$eval('#id_validity', (el: HTMLSelectElement) =>
        Array.from(el.selectedOptions).map(o => o.value)
    );
    console.log('Final Selected Validity:', selectedValidity);

    // Severity filter (checkboxes for Level 1, 2, 3)
    console.log(`Setting severity filter: ${CONFIG.filters.severity}`);
    const severityStr = CONFIG.filters.severity.toString();

    // Uncheck all first
    await page.uncheck('#id_level_1');
    await page.uncheck('#id_level_2');

    if (severityStr.includes('1')) await page.check('#id_level_1');
    if (severityStr.includes('2')) await page.check('#id_level_2');
    if (severityStr.includes('3')) await page.check('#id_level_3');

    // Click search button
    console.log('Submitting search...');
    await page.click('button.ui-button:has-text("Search")');

    // Wait for search results table to appear and rows to be populated
    console.log('Waiting for search results table to populate...');
    await page.waitForSelector('#event-search-list tr.jqgrow', { state: 'attached', timeout: 60000 });

    console.log('Filters applied and results loaded successfully');
}

/**
 * Download data as CSV
 */
async function downloadData(page: Page) {
    console.log('Initiating CSV download...');

    // Log the list of events found
    const eventIds = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#event-search-list tr.jqgrow'));
        return rows.map(row => {
            // Usually the reference is in a specific column, let's look for the one with the link or specific class
            const refCell = row.querySelector('td[aria-describedby="event-search-list_reference"]') ||
                row.querySelector('td:nth-child(4)'); // Column 4 is usually reference
            return refCell ? refCell.textContent?.trim() : 'Unknown';
        });
    });
    console.log('--- PENDING EVENTS FOUND ---');
    console.log(eventIds.join(', '));
    console.log('Total:', eventIds.length);
    console.log('----------------------------');

    // Capture results screenshot for verification
    await page.screenshot({ path: 'env/tmp/06-pre-download.png', fullPage: true });

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click the export/download button
    try {
        console.log('Attempting to find download button...');
        // Wait for results table container to be ready
        await page.waitForSelector('.ui-jqgrid-titlebar, .ui-userdata', { timeout: 10000 });

        // Try exact selectors found via exploration
        const exportSelectors = [
            'a.csv[title="Download as CSV"]',
            'a.csv',
            '[title*="Download as CSV"]',
            '[title*="Export to CSV"]',
            '.ui-jqgrid-titlebar .csv',
            '.ui-icon-arrowthickstop-1-s'
        ];

        let clicked = false;
        for (const selector of exportSelectors) {
            const btn = page.locator(selector).first();
            if (await btn.count() > 0) {
                console.log(`Found download button with selector: ${selector}`);
                await btn.click();
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            console.log('Standard selectors failed. Dumping screenshot for debugging...');
            await page.screenshot({ path: 'env/tmp/debug-download-failed.png', fullPage: true });
            throw new Error('Download button not found with any known selector');
        }

    } catch (e) {
        const error = e as Error;
        console.error('Could not click download button:', error.message);
        throw error;
    }

    const download = await downloadPromise;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `input_csvs/brazos_scraped_${timestamp}.csv`;

    // Ensure directory exists
    if (!fs.existsSync('input_csvs')) {
        fs.mkdirSync('input_csvs');
    }

    // Save to input_csvs
    await download.saveAs(filePath);
    console.log(`CSV saved to: ${filePath}`);

    return filePath;
}

/**
 * Main test workflow
 */
test('Brazos data extraction workflow', async ({ page }) => {
    // Enable detailed logging
    page.on('console', msg => console.log('Browser:', msg.text()));

    try {
        // Phase 1: Authentication
        await login(page);

        // Phase 2: Navigation
        await navigateToEvents(page);

        // Phase 3: Apply filters
        await applyFilters(page);

        // Phase 4: Download CSV
        const csvPath = await downloadData(page);

        console.log('Workflow completed successfully');
        if (csvPath) console.log('Data saved to:', csvPath);

        // Explicitly close page and context to ensure process exits
        await page.close();
        await page.context().close();
        process.exit(0);

    } catch (error) {
        console.error('Workflow failed:', error);
        throw error;
    }
});

