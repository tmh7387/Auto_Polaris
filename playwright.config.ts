import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from env/.env file
dotenv.config({ path: './env/.env' });

export default defineConfig({
    testDir: './resources',
    timeout: 600000,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1, // Run tests sequentially
    reporter: 'html',

    use: {
        baseURL: 'https://polaris.flightdataservices.com',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',

        // Even slower actions for better reliability given rate limiting
        actionTimeout: 60000,
        navigationTimeout: 90000,
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ],
});
