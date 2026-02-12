import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkServiceAccess() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
        console.error('Credentials or Service SID missing in .env');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log(`\n--- Checking Access for Service: ${serviceSid} ---`);
    console.log(`Using Account SID: ${accountSid}`);
    try {
        const service = await client.messaging.v1.services(serviceSid).fetch();
        console.log(`✅ Success! Service Found.`);
        console.log(`Friendly Name: ${service.friendlyName}`);
        console.log(`Status: ${service.statusCallback}`);

        // Now let's see if we can find ANY senders in THIS service
        const phoneNumbers = await client.messaging.v1.services(serviceSid).phoneNumbers.list();
        console.log(`Phone Numbers in Service: ${phoneNumbers.length}`);
        phoneNumbers.forEach(p => console.log(`  - ${p.phoneNumber}`));

    } catch (err: any) {
        console.error(`❌ FAILED to access service: ${err.message}`);
        if (err.status === 404) {
            console.log('--- DIAGNOSIS ---');
            console.log('The Account SID in your .env DOES NOT have access to this Messaging Service SID.');
            console.log('This confirms you are likely using the wrong Account SID or Token.');
        }
    }
}

checkServiceAccess();
