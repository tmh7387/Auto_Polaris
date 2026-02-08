import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: 'env/.env' });

interface Event {
    Code: string;
    'Event Short Desc': string;
    localDateString: string;
}

interface Metadata {
    flightRef: string;
    flightUrl: string;
    events: Event[];
}

async function sendAllWhatsAppNotifications() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        throw new Error('Required variables missing in .env');
    }

    const client = twilio(accountSid, authToken);
    const notificationsDir = 'env/assets/notifications';

    console.log('\n=== SENDING ALL WHATSAPP NOTIFICATIONS ===\n');

    // Get all notification directories
    const dirs = fs.readdirSync(notificationsDir)
        .filter(d => fs.statSync(path.join(notificationsDir, d)).isDirectory())
        .sort();

    console.log(`Found ${dirs.length} notification directories\n`);

    let successCount = 0;
    let failCount = 0;

    for (const dir of dirs) {
        const metadataPath = path.join(notificationsDir, dir, 'metadata.json');

        if (!fs.existsSync(metadataPath)) {
            console.log(`⚠️  Skipping ${dir} - no metadata.json`);
            continue;
        }

        try {
            const metadata: Metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            const flightRef = metadata.flightRef;
            const flightUrl = metadata.flightUrl;

            // Build event details
            let eventCodes = '';
            let eventDescs = '';
            let eventDate = '';

            if (metadata.events && metadata.events.length > 0) {
                eventCodes = metadata.events.map(e => e.Code).join(' & ');
                eventDescs = metadata.events.map(e => e['Event Short Desc']).join(' & ');
                eventDate = metadata.events[0].localDateString || '-';
            }

            const messageBody = `Hi WESTPAC FDM Team,

Brazos Safety has identified Level 3 event – ${eventCodes} - ${eventDescs} - ${eventDate}

The link to the event is below:
${flightUrl}`;

            console.log(`📤 Sending for Flight ${flightRef}...`);
            console.log(`   Events: ${eventCodes}`);

            const message = await client.messages.create({
                body: messageBody,
                from: fromNumber,
                to: toNumber
            });

            console.log(`   ✅ Sent! SID: ${message.sid}\n`);
            successCount++;

            // Wait 2 seconds between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (err: any) {
            console.error(`   ❌ Failed for ${dir}:`, err.message, '\n');
            failCount++;
        }
    }

    console.log('=== SUMMARY ===');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${successCount + failCount}`);
}

sendAllWhatsAppNotifications();
