import { test, expect, Page } from '@playwright/test';

/**
 * Brazos Flight Data Services - Data Extraction Workflow
 * 
 * This script automates the login, navigation, and data filtering process
 * on brazos.flightdataservices.com
 */

// Configuration - Move to .env file
const CONFIG = {
    baseUrl: 'https://brazos.flightdataservices.com',
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

    // Fill in login credentials using identified selectors
    await page.fill('#id_login', CONFIG.credentials.username);
    await page.fill('#id_password', CONFIG.credentials.password);

    // Click login button
    await page.click('button.ui-button:has-text("Login")');

    // Wait for successful login (redirect away from login page)
    await page.waitForURL((url) => !url.href.includes('/accounts/login'), { timeout: 10000 });

    console.log('Login successful');
}

/**
 * Navigate to the events/data extraction section
 */
async function navigateToEvents(page: Page) {
    console.log('Navigating to Open Events search page...');

    // Navigate directly to the Open Events search page
    await page.goto('https://brazos.flightdataservices.com/event/search/open/');
    await page.waitForLoadState('networkidle');

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

    // Wait for results to load
    await page.waitForLoadState('networkidle');

    console.log('Filters applied successfully');
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
    // Strategy: Look for title="Export to CSV" or specific class structure
    try {
        console.log('Attempting to find download button...');
        // Wait for the toolbar to be visible first
        await page.waitForSelector('.ui-jqgrid-titlebar, .ui-userdata', { timeout: 5000 }).catch(() => console.log('Toolbar not found immediately'));

        // Try multiple selectors
        const exportSelectors = [
            '[title="Download as CSV"]', // Specific title provided by user
            '.ui-jqgrid-titlebar [title="Download as CSV"]',
            '.ui-jqgrid-titlebar .buttons a[title="Download as CSV"]',
            // Fallbacks
            'td[title="Export to CSV"]',
            '.ui-icon-arrowthickstop-1-s'
        ];

        let clicked = false;
        for (const selector of exportSelectors) {
            if (await page.$(selector)) {
                console.log(`Found download button with selector: ${selector}`);
                await page.click(selector);
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            console.log('Standard selectors failed. Dumping page HTML for debugging...');
            const html = await page.content();
            // In a real scenario we might save this to a file, here we just throw
            throw new Error('Download button not found with any known selector');
        }

    } catch (e) {
        console.log('Could not click download button with standard selectors. Attempting fallback...');
        // Fallback to coordinates or broader search if needed in future
        throw new Error('Download button not found');
    }

    const download = await downloadPromise;
    const filePath = 'resources/brazos_pending_events.csv';

    // Save to resources
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

    } catch (error) {
        console.error('Workflow failed:', error);
        throw error;
    }
});

/**
 * Selector identification helper test
 * Run this first to explore the page and identify selectors
 */
test.skip('Identify selectors', async ({ page }) => {
    await page.goto(CONFIG.baseUrl);

    // Pause execution to manually explore the page
    await page.pause();
});
