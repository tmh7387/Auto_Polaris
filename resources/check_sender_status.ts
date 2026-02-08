import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkSender() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const senderNumber = 'whatsapp:+15557767997';

    if (!accountSid || !authToken) {
        console.error('Twilio credentials missing.');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log(`\n--- Checking WhatsApp Sender: ${senderNumber} ---`);
    try {
        // The REST API SID for a sender usually starts with XE...
        // Let's list and find it first
        const response: any = await client.request({
            method: 'GET',
            uri: '/v1/WhatsApp/Senders'
        });

        const senders = response.body.senders || [];
        console.log(`Found ${senders.length} senders.`);
        for (const s of senders) {
            console.log(`  SID: ${s.sid}, Number: ${s.whatsapp_number}, Status: ${s.sender_status}`);
            if (s.whatsapp_number === '+15557767997') {
                console.log(`    FULL DETAILS: ${JSON.stringify(s, null, 2)}`);
            }
        }

    } catch (err: any) {
        console.error('Error checking sender:', err.message);
    }
}

checkSender();
