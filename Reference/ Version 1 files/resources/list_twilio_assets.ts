import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function listWhatsAppSenders() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        console.error('Twilio credentials missing.');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log('\n--- Listing WhatsApp Senders (Direct REST) ---');
    try {
        // Use the request method to hit the Senders endpoint
        // The endpoint is https://messaging.twilio.com/v1/WhatsApp/Senders
        const response: any = await client.request({
            method: 'GET',
            uri: 'https://messaging.twilio.com/v1/WhatsApp/Senders'
        });

        console.log('Status Code:', response.statusCode);
        const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        const senders = body.senders || [];
        console.log(`Found ${senders.length} WhatsApp Senders:`);
        for (const s of senders) {
            console.log(`  Number: ${s.whatsapp_number}, SID: ${s.sid}, Status: ${s.sender_status}`);
        }

    } catch (err: any) {
        console.error('Error fetching WhatsApp senders:', err.message);
    }
}

listWhatsAppSenders();
