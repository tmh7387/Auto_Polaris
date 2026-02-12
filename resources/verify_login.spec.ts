import { test, expect } from '@playwright/test';

/**
 * Simple login verification test
 * This test verifies that the login selectors work correctly
 */
test('Verify Brazos login functionality', async ({ page }) => {
    // Check that credentials are configured
    const username = process.env.BRAZOS_USERNAME;
    const password = process.env.BRAZOS_PASSWORD;

    if (!username || !password) {
        throw new Error('BRAZOS_USERNAME and BRAZOS_PASSWORD must be set in .env file');
    }

    console.log('Starting login test...');

    // Navigate to Polaris
    await page.goto('https://polaris.flightdataservices.com');

    // Wait for login page to load
    await page.waitForSelector('#id_login', { timeout: 10000 });

    // Fill in credentials
    console.log('Filling in username...');
    await page.fill('#id_login', username);

    console.log('Filling in password...');
    await page.fill('#id_password', password);

    // Click login button
    console.log('Clicking login button...');
    await page.click('button.ui-button:has-text("Login")');

    // Wait for redirect (successful login)
    await page.waitForURL((url) => !url.href.includes('/accounts/login'), {
        timeout: 15000
    });

    console.log('✅ Login successful!');

    // Take a screenshot of the logged-in page
    await page.screenshot({
        path: 'env/tmp/logged-in-page.png',
        fullPage: true
    });

    console.log('Screenshot saved to env/tmp/logged-in-page.png');

    // Pause for 3 seconds to observe the page
    await page.waitForTimeout(3000);
});
