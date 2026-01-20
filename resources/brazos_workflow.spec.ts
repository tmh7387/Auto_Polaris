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
        eventValidity: ['Valid', 'Auto Valid', 'Pending'],
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
    for (const status of CONFIG.filters.eventStatus) {
        const value = status.toUpperCase().replace(' ', '_');
        await page.selectOption('#id_status', value);
    }

    // Event Validity filter (multi-select)
    // Values: MANUAL_VALID (Valid), AUTO_VALID, INVALID, PENDING
    console.log(`Setting event validity: ${CONFIG.filters.eventValidity.join(', ')}`);
    for (const validity of CONFIG.filters.eventValidity) {
        let value = validity;
        if (validity === 'Valid') value = 'MANUAL_VALID';
        if (validity === 'Auto Valid') value = 'AUTO_VALID';
        value = value.toUpperCase().replace(' ', '_');
        await page.selectOption('#id_validity', value);
    }

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
 * Extract data from the results table
 */
async function extractData(page: Page) {
    console.log('Extracting data...');

    // Wait for results to load
    try {
        console.log('Waiting for results table...');
        // Wait up to 30s for the table rows
        await page.waitForSelector('#event-search-list tr.jqgrow', { state: 'attached', timeout: 30000 });
        console.log('Results table found and populated');
    } catch (e) {
        console.log('No results found (table empty) or timed out. Taking debug screenshot...');
        await page.screenshot({ path: 'env/tmp/debug-no-results.png', fullPage: true });
        console.log('Debug screenshot saved: env/tmp/debug-no-results.png');
        return [];
    }

    // Capture results screenshot (if successful)
    await page.screenshot({
        path: 'env/tmp/05-search-results.png',
        fullPage: true
    });
    console.log('Screenshot saved: env/tmp/05-search-results.png');

    // Extract data from table rows
    const data = await page.$$eval('#event-search-list tr.jqgrow', rows => {
        return rows.map(row => {
            // Helper to get text from cell by aria-describedby ID
            const getText = (colId: string) => {
                const cell = row.querySelector(`td[aria-describedby="event-search-list_${colId}"]`);
                return cell ? cell.textContent?.trim() || '' : '';
            };

            return {
                reference: getText('flight__id'),
                fleet: getText('flight__aircraft__fleet__name'),
                status: getText('status'),
                validity: getText('validity'),
                severity: getText('threshold__level'),
                dateTime: getText('datetime'),
                description: getText('threshold__definition__abbreviation'),
                aircraft: getText('flight__aircraft__registration'),
                flightNumber: getText('flight__flight_number')
            };
        });
    });

    console.log(`Extracted ${data.length} records.`);
    if (data.length > 0) {
        console.log('Sample record:', data[0]);
    }

    return data;
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

        // Phase 4: Extract data
        const data = await extractData(page);

        console.log('Workflow completed successfully');
        // console.log('Extracted data:', data);

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
