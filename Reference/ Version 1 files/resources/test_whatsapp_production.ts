import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function testWhatsAppProduction() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid) || !toNumber || !contentSid) {
        throw new Error('Required variables missing in .env');
    }

    const client = twilio(accountSid, authToken);

    console.log('--- WHATSAPP PRODUCTION TEST START ---');
    console.log(`To: ${toNumber}`);
    console.log(`Using Service: ${messagingServiceSid || 'None'}`);
    console.log(`Using Content SID: ${contentSid}`);

    try {
        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                "1": "TST102",
                "2": "Direct Number Test",
                "3": new Date().toLocaleString(),
                "4": "https://polaris.flightdataservices.com/"
            }),
            // messagingServiceSid: messagingServiceSid,
            from: fromNumber,
            to: toNumber
        });

        console.log(`✅ Success! Message SID: ${message.sid}`);
        console.log(`Status: ${message.status}`);
    } catch (err) {
        console.error('❌ Test Failed:', err);
    }
}

testWhatsAppProduction();
