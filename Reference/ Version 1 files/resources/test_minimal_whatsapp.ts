import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function testMinimalWhatsApp() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    if (!accountSid || !authToken || !fromNumber || !toNumber || !contentSid) {
        throw new Error('Required variables missing in .env');
    }

    const client = twilio(accountSid, authToken);

    console.log('\n=== MINIMAL WHATSAPP TEST ===');
    console.log(`From: ${fromNumber}`);
    console.log(`To: ${toNumber}`);
    console.log(`Content SID: ${contentSid}`);

    // First, let's get the exact template structure
    console.log('\n--- Fetching Template Details ---');
    try {
        const template: any = await (client as any).content.v1.contents(contentSid).fetch();
        console.log('Template Name:', template.friendlyName);
        console.log('Template Types:', JSON.stringify(template.types, null, 2));
    } catch (err: any) {
        console.error('Error fetching template:', err.message);
    }

    // Now try a minimal send
    console.log('\n--- Attempting Send ---');
    try {
        const message = await client.messages.create({
            contentSid: contentSid,
            contentVariables: JSON.stringify({
                "1": "TEST",
                "2": "Minimal Test",
                "3": "2026-02-07",
                "4": "https://example.com"
            }),
            from: fromNumber,
            to: toNumber
        });

        console.log(`✅ Message Created!`);
        console.log(`SID: ${message.sid}`);
        console.log(`Status: ${message.status}`);
        console.log(`Error Code: ${message.errorCode || 'None'}`);
        console.log(`Error Message: ${message.errorMessage || 'None'}`);

        // Wait a few seconds and check status again
        console.log('\n--- Waiting 5 seconds to check final status ---');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const updated = await client.messages(message.sid).fetch();
        console.log(`Final Status: ${updated.status}`);
        console.log(`Final Error Code: ${updated.errorCode || 'None'}`);
        console.log(`Final Error Message: ${updated.errorMessage || 'None'}`);

    } catch (err: any) {
        console.error('❌ Send Failed:', err.message);
        if (err.code) console.error('Error Code:', err.code);
        if (err.moreInfo) console.error('More Info:', err.moreInfo);
    }
}

testMinimalWhatsApp();
