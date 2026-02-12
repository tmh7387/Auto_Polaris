import { test } from '@playwright/test';

/**
 * Debug login test with detailed error output
 */
test('Debug Brazos login', async ({ page }) => {
    console.log('=== DEBUG LOGIN TEST ===');
    console.log('Username:', process.env.BRAZOS_USERNAME ? 'SET' : 'NOT SET');
    console.log('Password:', process.env.BRAZOS_PASSWORD ? 'SET' : 'NOT SET');

    try {
        console.log('\n1. Navigating to Brazos...');
        const baseUrl = 'https://polaris.flightdataservices.com';
        await page.goto(baseUrl);
        console.log('   ✓ Navigation successful');

        console.log('\n2. Waiting for username field...');
        await page.waitForSelector('#id_login', { timeout: 10000 });
        console.log('   ✓ Username field found');

        console.log('\n3. Filling username...');
        await page.fill('#id_login', process.env.BRAZOS_USERNAME || '');
        console.log('   ✓ Username filled');

        console.log('\n4. Filling password...');
        await page.fill('#id_password', process.env.BRAZOS_PASSWORD || '');
        console.log('   ✓ Password filled');

        console.log('\n5. Clicking login button...');
        await page.click('button.ui-button:has-text("Login")');
        console.log('   ✓ Login button clicked');

        console.log('\n6. Waiting for redirect...');
        await page.waitForURL((url) => !url.href.includes('/accounts/login'), {
            timeout: 15000
        });
        console.log('   ✓ Redirect successful');

        const currentUrl = page.url();
        console.log('\n SUCCESS! Current URL:', currentUrl);

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED:', error);
        console.error('Error message:', (error as Error).message);
        console.error('Current URL:', page.url());

        // Take debug screenshot
        await page.screenshot({
            path: 'env/tmp/debug-error.png',
            fullPage: true
        });
        console.log('Debug screenshot saved to env/tmp/debug-error.png');

        throw error;
    }
});
