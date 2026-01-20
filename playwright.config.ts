import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from env/.env file
dotenv.config({ path: './env/.env' });

export default defineConfig({
    testDir: './resources',
    timeout: 120000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Run tests sequentially
    reporter: 'html',

    use: {
        baseURL: 'https://brazos.flightdataservices.com',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Slower actions for better reliability
        actionTimeout: 30000,
        navigationTimeout: 60000,
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome', // Use system Chrome
                launchOptions: {
                    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Explicit path for reliability
                }
            },
        },
    ],
});
