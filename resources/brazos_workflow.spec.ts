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
async function applyFilters(page: Page): Promise<boolean> {
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
    // Values: MANUAL_VALID (Valid), AUTO_VALID, INVALID, PENDING
    console.log(`Setting event validity: ${CONFIG.filters.eventValidity.join(', ')}`);
    const validityValues = CONFIG.filters.eventValidity.map(v => {
        if (v === 'Valid') return 'MANUAL_VALID';
        if (v === 'Auto Valid') return 'AUTO_VALID';
        return v.toUpperCase().replace(' ', '_');
    });
    await page.selectOption('#id_validity', validityValues);

    // Severity filter (checkboxes for Level 1, 2, 3)
    console.log(`Setting severity filter: ${CONFIG.filters.severity}`);
    const severityStr = CONFIG.filters.severity.toString();

    // Uncheck all first (optional, but good practice if state persists)
    // await page.uncheck('#id_level_1');
    // await page.uncheck('#id_level_2');
    // await page.uncheck('#id_level_3');

    if (severityStr.includes('1')) await page.check('#id_level_1');
    if (severityStr.includes('2')) await page.check('#id_level_2');
    if (severityStr.includes('3')) await page.check('#id_level_3');

    // Click search button
    console.log('Submitting search...');
    await page.click('button.ui-button:has-text("Search")');

    // Wait for either: result rows OR "no results" state
    // The grid always renders; if no rows, there are zero tr.jqgrow elements
    console.log('Waiting for search results...');
    try {
        // Race: wait for result rows with a reasonable timeout
        await page.waitForSelector('#event-search-list tr.jqgrow', { state: 'attached', timeout: 20000 });
        console.log('Filters applied and results loaded successfully');
        return true; // Results found
    } catch (e) {
        // No rows appeared — check if the grid loaded but is empty (valid zero-results)
        const gridExists = await page.locator('#event-search-list').count() > 0;
        if (gridExists) {
            console.log('✅ Search completed — 0 events match the current filters. Nothing to process.');
            return false; // No results, but not an error
        }
        // Grid itself didn't load — that's an actual error
        throw e;
    }
}

/**
 * Download data as CSV
 */
async function downloadData(page: Page) {
    console.log('Initiating CSV download...');

    // Wait for results to load (checking table presence to ensure search finished)
    try {
        await page.waitForSelector('#event-search-list tr.jqgrow', { state: 'attached', timeout: 30000 });
        console.log('Results table populated.');
    } catch (e) {
        console.log('No results found or timed out. Taking debug screenshot...');
        await page.screenshot({ path: 'env/tmp/debug-download-no-results.png', fullPage: true });
        return null;
    }

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
        const hasResults = await applyFilters(page);

        if (!hasResults) {
            console.log('\n📋 No Level 3 events found matching filters. Workflow complete — nothing to process.');
            await page.close();
            await page.context().close();
            process.exit(0);
        }

        // Phase 4: Download CSV (only if there are results)
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

