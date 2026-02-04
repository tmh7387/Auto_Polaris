import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import twilio from 'twilio';

// Load env from specific path if not found
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

/**
 * TWILIO WHATSAPP SENDER
 * This script sends WhatsApp notifications using the Twilio API.
 * It reads the local notification folders and sends the draft message to the configured to-number.
 */

async function sendWhatsAppNotifications() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        throw new Error('Twilio credentials (SID, Token, From, To) must be set in .env');
    }

    const client = twilio(accountSid, authToken);
    const notificationsDir = 'env/assets/notifications';

    // 1. Identify processed events
    if (!fs.existsSync(notificationsDir)) {
        console.log('Notifications directory not found.');
        return;
    }

    const eventDirs = fs.readdirSync(notificationsDir)
        .filter(f => fs.statSync(path.join(notificationsDir, f)).isDirectory());

    console.log(`Found ${eventDirs.length} events to notify via WhatsApp.`);

    if (eventDirs.length === 0) {
        console.log('No WhatsApp notifications to process.');
        return;
    }

    // 2. Send notifications
    for (const ref of eventDirs) {
        try {
            await sendEventNotification(client, ref, fromNumber, toNumber);
        } catch (error) {
            console.error(`Failed to send WhatsApp for ${ref}:`, error);
        }
    }
}

async function sendEventNotification(client: any, ref: string, from: string, to: string) {
    const eventDir = path.join('env/assets/notifications', ref);
    const msgPath = path.join(eventDir, 'whatsapp_draft.txt');
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const messageBody = fs.readFileSync(msgPath, 'utf-8');
    const contentSid = process.env.TWILIO_CONTENT_SID;

    console.log(`Checking files for ${ref}: msg=${fs.existsSync(msgPath)}, meta=${fs.existsSync(metaPath)}`);
    if (!fs.existsSync(msgPath) || !fs.existsSync(metaPath)) {
        console.log(`Skipping ${ref} - files missing.`);
        return;
    }
    const contentSid = process.env.TWILIO_CONTENT_SID;

    console.log(`Sending WhatsApp for ${ref}...`);

    if (contentSid) {
        // PRODUCTION MODE: Using Message Templates (Content API)
        // Note: contentVariables must match the approved template placeholders
        console.log('Using Production Template (Content SID)...');
        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                "1": metadata.Code || "-",
                "2": metadata['Event Short Desc'] || "-",
                "3": metadata.localDateString || "-",
                "4": metadata.flightUrl || "-"
            }),
            from: from,
            to: to
        });
        console.log(`✓ Template WhatsApp sent for ${ref}. SID: ${message.sid}`);
    } else {
        // SANDBOX MODE: Using free-text Body
        console.log('Using Sandbox/In-Session Body...');
        const message = await client.messages.create({
            body: messageBody,
            from: from,
            to: to
        });
        console.log(`✓ Sandbox WhatsApp sent for ${ref}. SID: ${message.sid}`);
    }
}

sendWhatsAppNotifications().catch(err => {
    console.error('WhatsApp Sender CRASHED:', err);
    process.exit(1);
});
