import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function sendWhatsAppNotification() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    if (!accountSid || !authToken || !fromNumber || !toNumber || !contentSid) {
        throw new Error('Required variables missing in .env');
    }

    const client = twilio(accountSid, authToken);

    // Event data from Flight 68804172
    const eventCode = "ETB300";
    const eventDesc = "Eng Torque Low Below 300ft AGL";
    const eventDate = "Feb 06, 2026";
    const flightUrl = "https://polaris.flightdataservices.com/flight/68804172/";

    console.log('\n=== SENDING WHATSAPP NOTIFICATION ===');
    console.log(`Event: ${eventCode} - ${eventDesc}`);
    console.log(`Date: ${eventDate}`);
    console.log(`URL: ${flightUrl}`);

    try {
        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                "1": eventCode,
                "2": eventDesc,
                "3": eventDate,
                "4": flightUrl
            }),
            from: fromNumber,
            to: toNumber
        });

        console.log(`\n✅ Message Sent!`);
        console.log(`SID: ${message.sid}`);
        console.log(`Status: ${message.status}`);

        // Wait and check final status
        console.log('\n--- Waiting 5 seconds to check delivery status ---');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const updated = await client.messages(message.sid).fetch();
        console.log(`Final Status: ${updated.status}`);

        if (updated.status === 'delivered' || updated.status === 'sent' || updated.status === 'read') {
            console.log('\n✅ SUCCESS! WhatsApp notification delivered!');
        } else {
            console.log(`\n⚠️  Message status: ${updated.status}`);
            if (updated.errorCode) {
                console.log(`Error Code: ${updated.errorCode}`);
                console.log(`Error Message: ${updated.errorMessage}`);
            }
        }

    } catch (err: any) {
        console.error('❌ Send Failed:', err.message);
        if (err.code) console.error('Error Code:', err.code);
    }
}

sendWhatsAppNotification();
