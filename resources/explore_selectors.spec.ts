import { test, expect } from '@playwright/test';

/**
 * Interactive selector exploration
 * This test logs in and pauses for manual exploration
 */
test('Explore Brazos selectors', async ({ page }) => {
    const username = process.env.BRAZOS_USERNAME;
    const password = process.env.BRAZOS_PASSWORD;

    if (!username || !password) {
        throw new Error('Credentials not set');
    }

    console.log('=== BRAZOS SELECTOR EXPLORATION ===\n');

    // Login
    console.log('1. Logging in...');
    await page.goto('https://polaris.flightdataservices.com');
    await page.waitForSelector('#id_login');
    await page.fill('#id_login', username);
    await page.fill('#id_password', password);
    await page.click('button.ui-button:has-text("Login")');

    // Wait for successful login
    await page.waitForURL((url) => !url.href.includes('/accounts/login'), {
        timeout: 15000
    });
    console.log('✓ Login successful\n');

    // Take screenshot of homepage
    await page.screenshot({
        path: 'env/tmp/01-logged-in-homepage.png',
        fullPage: true
    });
    console.log('Screenshot: env/tmp/01-logged-in-homepage.png\n');

    // Look for navigation elements
    console.log('2. Searching for navigation elements...\n');

    // Common navigation patterns to check
    const navPatterns = [
        { name: 'Events link', selector: 'a:has-text("Events")' },
        { name: 'Search link', selector: 'a:has-text("Search")' },
        { name: 'Fleet link', selector: 'a:has-text("Fleet")' },
        { name: 'Data link', selector: 'a:has-text("Data")' },
        { name: 'Analysis link', selector: 'a:has-text("Analysis")' },
    ];

    let foundNavigation = false;
    for (const pattern of navPatterns) {
        try {
            const element = await page.locator(pattern.selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
                console.log(`✓ Found: ${pattern.name} - ${pattern.selector}`);
                foundNavigation = true;
            }
        } catch (e) {
            // Element not found, continue
        }
    }

    if (!foundNavigation) {
        console.log('No standard navigation links found. Exploring page content...\n');
    }

    // Get current URL
    console.log(`\nCurrent URL: ${page.url()}\n`);

    // Look for common filter elements
    console.log('3. Searching for filter/form elements...\n');

    const filterPatterns = [
        { name: 'Fleet input/select', patterns: ['#fleet', '[name="fleet"]', 'select[name*="fleet"]', 'input[name*="fleet"]'] },
        { name: 'Event Status', patterns: ['#event_status', '[name="event_status"]', 'select[name*="status"]'] },
        { name: 'Event Validity', patterns: ['#event_validity', '[name="event_validity"]', 'select[name*="validity"]'] },
        { name: 'Severity', patterns: ['#severity', '[name="severity"]', 'select[name*="severity"]', 'input[name*="severity"]'] },
    ];

    for (const filter of filterPatterns) {
        let found = false;
        for (const selector of filter.patterns) {
            try {
                const element = await page.locator(selector).first();
                if (await element.count() > 0) {
                    console.log(`✓ Found ${filter.name}: ${selector}`);
                    found = true;
                    break;
                }
            } catch (e) {
                // Continue checking
            }
        }
        if (!found) {
            console.log(`✗ ${filter.name}: Not found on current page`);
        }
    }

    console.log('\n4. Taking full page screenshot...');
    await page.screenshot({
        path: 'env/tmp/02-exploration-page.png',
        fullPage: true
    });
    console.log('Screenshot: env/tmp/02-exploration-page.png\n');

    // Get all visible text to understand page structure
    console.log('5. Page text content (first 500 chars):');
    const bodyText = await page.locator('body').textContent();
    console.log(bodyText?.slice(0, 500) + '...\n');

    console.log('\n=== PAUSING FOR MANUAL EXPLORATION ===');
    console.log('Use Playwright Inspector to:');
    console.log('  - Explore the page structure');
    console.log('  - Click on navigation items');
    console.log('  - Identify filter selectors');
    console.log('  - Take additional screenshots');
    console.log('\nPress Resume in the Inspector when done.\n');

    // Pause for manual exploration
    await page.pause();
});
