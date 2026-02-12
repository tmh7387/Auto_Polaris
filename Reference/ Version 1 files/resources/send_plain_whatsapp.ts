import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function sendPlainWhatsApp() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        throw new Error('Required variables missing in .env');
    }

    const client = twilio(accountSid, authToken);

    // Event data from Flight 68804172
    const eventCode = "ETB300";
    const eventDesc = "Eng Torque Low Below 300ft AGL";
    const eventDate = "Feb 06, 2026";
    const flightUrl = "https://polaris.flightdataservices.com/flight/68804172/";

    // Create the message body
    const messageBody = `Hi WESTPAC FDM Team,

Brazos Safety has identified Level 3 event – ${eventCode} - ${eventDesc} - ${eventDate}

The link to the event is below:
${flightUrl}`;

    console.log('\n=== SENDING PLAIN TEXT WHATSAPP ===');
    console.log(messageBody);
    console.log('\n---');

    try {
        const message = await client.messages.create({
            body: messageBody,
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

sendPlainWhatsApp();
