import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkAllSenderTypes() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
        console.error('Credentials missing');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log(`\n--- Checking ALL Sender Types in Service ${serviceSid} ---`);

    try {
        // Check regular phone numbers
        const phoneNumbers = await client.messaging.v1.services(serviceSid).phoneNumbers.list();
        console.log(`\n📱 Phone Numbers: ${phoneNumbers.length}`);
        phoneNumbers.forEach(p => console.log(`  - ${p.phoneNumber} (SID: ${p.sid})`));

        // Check alpha senders
        const alphaSenders = await client.messaging.v1.services(serviceSid).alphaSenders.list();
        console.log(`\n🔤 Alpha Senders: ${alphaSenders.length}`);
        alphaSenders.forEach(a => console.log(`  - ${a.alphaSender}`));

        // Check short codes
        const shortCodes = await client.messaging.v1.services(serviceSid).shortCodes.list();
        console.log(`\n#️⃣  Short Codes: ${shortCodes.length}`);
        shortCodes.forEach(s => console.log(`  - ${s.shortCode}`));

        console.log('\n--- DIAGNOSIS ---');
        if (phoneNumbers.length === 0 && alphaSenders.length === 0 && shortCodes.length === 0) {
            console.log('❌ The service has NO senders of any type in the API.');
            console.log('This means the WhatsApp sender was likely added through the UI but not properly synced.');
            console.log('\nPossible fixes:');
            console.log('1. Remove the sender from the pool and re-add it');
            console.log('2. Check if the sender needs to be "activated" or "verified"');
            console.log('3. Contact Twilio support - there may be a sync issue');
        }

    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

checkAllSenderTypes();
