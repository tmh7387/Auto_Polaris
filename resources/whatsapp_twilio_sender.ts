import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import twilio from 'twilio';

// Load env from specific path if not found
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function sendWhatsAppNotifications() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        throw new Error('Twilio credentials (SID, Token, From, To) must be set in .env');
    }

    console.log('--- WHATSAPP SENDER START ---');
    console.log(`Config: From=${fromNumber}, To=${toNumber}, ContentSID=${contentSid}`);

    const client = twilio(accountSid, authToken);
    const notificationsDir = 'env/assets/notifications';

    if (!fs.existsSync(notificationsDir)) {
        console.log('Notifications directory not found.');
        return;
    }

    const eventDirs = fs.readdirSync(notificationsDir)
        .filter(f => fs.statSync(path.join(notificationsDir, f)).isDirectory());

    console.log(`Found ${eventDirs.length} events: ${eventDirs.join(', ')}`);

    for (const ref of eventDirs) {
        const eventDir = path.join(notificationsDir, ref);
        const msgPath = path.join(eventDir, 'whatsapp_draft.txt');
        const metaPath = path.join(eventDir, 'metadata.json');

        console.log(`Processing ${ref}...`);

        if (!fs.existsSync(msgPath) || !fs.existsSync(metaPath)) {
            console.log(`  Skipping ${ref} - missing files: msg=${fs.existsSync(msgPath)}, meta=${fs.existsSync(metaPath)}`);
            continue;
        }

        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const messageBody = fs.readFileSync(msgPath, 'utf-8');

        try {
            if (contentSid) {
                console.log(`  Sending via Content API (Template)...`);
                const message = await client.messages.create({
                    contentSid: contentSid,
                    contentVariables: JSON.stringify({
                        "1": metadata.Code || "-",
                        "2": metadata['Event Short Desc'] || "-",
                        "3": metadata.localDateString || "-",
                        "4": metadata.flightUrl || "-"
                    }),
                    from: fromNumber,
                    to: toNumber
                });
                console.log(`  ✓ SID: ${message.sid}`);
            } else {
                console.log(`  Sending via Sandbox Body...`);
                const message = await client.messages.create({
                    body: messageBody,
                    from: fromNumber,
                    to: toNumber
                });
                console.log(`  ✓ SID: ${message.sid}`);
            }
        } catch (err) {
            console.error(`  X Failed for ${ref}:`, err);
        }
    }
    console.log('--- WHATSAPP SENDER DONE ---');
}

sendWhatsAppNotifications().catch(console.error);
