import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function testSandbox() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    if (!accountSid || !authToken || !fromNumber || !toNumber || !contentSid) {
        throw new Error('Required variables missing in .env');
    }

    const client = twilio(accountSid, authToken);

    console.log('\n=== SANDBOX WHATSAPP TEST ===');
    console.log(`From: ${fromNumber}`);
    console.log(`To: ${toNumber}`);
    console.log(`Content SID: ${contentSid}`);

    console.log('\n--- Attempting Send ---');
    try {
        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                "1": "12/1",
                "2": "3pm"
            }),
            from: fromNumber,
            to: toNumber
        });

        console.log(`✅ Message Created!`);
        console.log(`SID: ${message.sid}`);
        console.log(`Status: ${message.status}`);
        console.log(`Error Code: ${message.errorCode || 'None'}`);

        // Wait and check final status
        console.log('\n--- Waiting 5 seconds to check final status ---');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const updated = await client.messages(message.sid).fetch();
        console.log(`Final Status: ${updated.status}`);
        console.log(`Final Error Code: ${updated.errorCode || 'None'}`);
        console.log(`Final Error Message: ${updated.errorMessage || 'None'}`);

        if (updated.status === 'delivered' || updated.status === 'sent') {
            console.log('\n✅ SUCCESS! Sandbox WhatsApp is working!');
        } else {
            console.log(`\n⚠️  Message status: ${updated.status}`);
        }

    } catch (err: any) {
        console.error('❌ Send Failed:', err.message);
        if (err.code) console.error('Error Code:', err.code);
    }
}

testSandbox();
