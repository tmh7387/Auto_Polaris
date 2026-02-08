import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkWABA() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        console.error('Twilio credentials missing.');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log('\n--- Checking WhatsApp Business Senders & WABA ---');
    try {
        // We can list senders and see if they have a WABA ID
        const response: any = await client.request({
            method: 'GET',
            uri: 'https://messaging.twilio.com/v1/WhatsApp/Senders'
        });

        const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        const senders = body.senders || [];
        console.log(`Found ${senders.length} WhatsApp Senders:`);
        for (const s of senders) {
            console.log(`  Number: ${s.whatsapp_number}, SID: ${s.sid}`);
            console.log(`  WABA SID: ${s.whatsapp_business_account_sid}`);
            console.log(`  Status: ${s.sender_status}`);
            console.log(`  Country: ${s.country_code}`);
        }

    } catch (err: any) {
        // If the URL is wrong, try another way
        console.error('Error fetching via messaging.twilio.com/v1/WhatsApp/Senders:', err.message);
    }
}

checkWABA();
