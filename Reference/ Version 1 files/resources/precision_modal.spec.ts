import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import 'dotenv/config';

test('Precision modal interaction', async ({ page }) => {
    const username = 'ahouston@brazossafety.com';
    const password = process.env.BRAZOS_PASSWORD;

    await page.goto('https://outlook.office365.com/mail/');
    await page.fill('input[type="email"]', username);
    await page.click('input[type="submit"]');
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.fill('input[type="password"]', password);
    await page.click('input[type="submit"]');
    try {
        await page.click('input#idSIButton9, input[value="Yes"]', { timeout: 5000 });
    } catch (e) { }

    await page.getByRole('button', { name: /New mail/i }).waitFor({ timeout: 60000 });
    await page.getByRole('button', { name: /New mail/i }).first().click();
    await page.waitForTimeout(5000);

    // Target the "To" button in the compose area
    console.log('Finding To button...');
    const toButton = page.locator('div[role="main"] button:has-text("To")').or(page.locator('button[aria-label^="To"]')).first();
    await toButton.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'env/logs/modal_opened.png' });

    // Look for "Contacts" on the left of the modal
    console.log('Looking for Contacts tab...');
    const contactsTab = page.locator('div[role="dialog"] >> text=Contacts').or(page.getByText('Contacts', { exact: true }));
    if (await contactsTab.count() > 0) {
        console.log('Contacts tab found, clicking...');
        await contactsTab.first().click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'env/logs/modal_contacts_clicked.png' });

        // Find the contact list
        console.log('Looking for contact list item...');
        const contactItem = page.locator('div[role="dialog"] >> text=WestPac_FDM_Event_Notification').first();
        if (await contactItem.count() > 0) {
            console.log('Contact list item found, clicking...');
            await contactItem.click({ force: true });
            await page.waitForTimeout(1000);

            // Look for Save button
            const saveBtn = page.locator('div[role="dialog"] >> button:has-text("Save")').or(page.getByRole('button', { name: /Save/i }));
            if (await saveBtn.count() > 0) {
                console.log('Save button found, clicking...');
                await saveBtn.first().click();
            }
        }
    } else {
        console.log('Contacts tab not found in dialog');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'env/logs/modal_final.png' });
});
