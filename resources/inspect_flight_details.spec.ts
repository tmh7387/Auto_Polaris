import { test, expect, Page } from '@playwright/test';

const CONFIG = {
    baseUrl: 'https://polaris.flightdataservices.com',
    targetUrl: 'https://polaris.flightdataservices.com/flight/68199568/',
    credentials: {
        username: process.env.BRAZOS_USERNAME || '',
        password: process.env.BRAZOS_PASSWORD || ''
    }
};

test('Inspect Flight Details Simple', async ({ page }) => {
    // 1. Go directly to target (Polaris)
    console.log(`Navigating to target flight: ${CONFIG.targetUrl}`);
    await page.goto(CONFIG.targetUrl);

    // 2. Check if we need to login
    // Using a generic wait for either the content OR a login field
    try {
        await page.waitForSelector('#id_login, text=Date & Time', { timeout: 10000 });
    } catch (e) {
        console.log('Timeout waiting for initial selector');
    }

    if (await page.$('#id_login')) {
        console.log('Login form detected. Logging in...');
        await page.fill('#id_login', CONFIG.credentials.username);
        await page.fill('#id_password', CONFIG.credentials.password);

        // Try multiple login button selectors
        if (await page.$('button:has-text("Login")')) {
            await page.click('button:has-text("Login")');
        } else if (await page.$('input[type="submit"]')) {
            await page.click('input[type="submit"]');
        } else {
            await page.press('#id_password', 'Enter');
        }

        await page.waitForNavigation().catch(() => console.log('Navigation wait after login timed out.'));
    }

    // 3. Wait for content
    console.log('Waiting for flight details...');
    await page.waitForTimeout(5000);

    // 4. Dump Body
    console.log(`Current URL: ${page.url()}`);
    console.log('Dumping Page Content...');
    const content = await page.content();
    console.log('--- HTML DUMP START ---');
    console.log(content);
    console.log('--- HTML DUMP END ---');
});
