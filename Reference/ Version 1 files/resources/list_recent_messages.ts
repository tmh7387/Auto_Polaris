import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function listRecentMessages() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        console.error('Credentials missing');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log('\n--- Listing Last 10 Messages ---');
    try {
        const messages = await client.messages.list({ limit: 10 });
        console.log(`Found ${messages.length} messages.`);
        messages.forEach(m => {
            console.log(`SID: ${m.sid}`);
            console.log(`  To: ${m.to}`);
            console.log(`  From: ${m.from}`);
            console.log(`  Status: ${m.status}`);
            console.log(`  Error: ${m.errorCode} - ${m.errorMessage}`);
            console.log(`  Service SID: ${m.messagingServiceSid || 'None'}`);
            console.log('-------------------');
        });
    } catch (err: any) {
        console.error('Error listing messages:', err.message);
    }
}

listRecentMessages();
