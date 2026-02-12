import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function diagnoseWABA() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        throw new Error('Credentials missing');
    }

    const client = twilio(accountSid, authToken);

    console.log('\n=== WABA DIAGNOSTIC ===\n');

    // Try to get detailed sender info via REST API
    try {
        const response: any = await client.request({
            method: 'GET',
            uri: '/2010-04-01/Accounts/' + accountSid + '/Messages.json?PageSize=1'
        });

        const body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        const lastMessage = body.messages?.[0];

        if (lastMessage) {
            console.log('Last Message Details:');
            console.log(`  SID: ${lastMessage.sid}`);
            console.log(`  Status: ${lastMessage.status}`);
            console.log(`  Error Code: ${lastMessage.error_code || 'None'}`);
            console.log(`  Error Message: ${lastMessage.error_message || 'None'}`);
            console.log(`  From: ${lastMessage.from}`);
            console.log(`  To: ${lastMessage.to}`);
        }
    } catch (err: any) {
        console.error('Error fetching message details:', err.message);
    }

    console.log('\n--- Checking Account Status ---');
    try {
        const account = await client.api.accounts(accountSid).fetch();
        console.log(`Account Status: ${account.status}`);
        console.log(`Account Type: ${account.type}`);
    } catch (err: any) {
        console.error('Error:', err.message);
    }

    console.log('\n--- DIAGNOSIS ---');
    console.log('Error 63112 = Meta/WABA disabled or business verification pending');
    console.log('\nPossible causes:');
    console.log('1. Business verification is pending in Meta Business Manager');
    console.log('2. WABA has been temporarily restricted by Meta');
    console.log('3. Display name approval is pending');
    console.log('4. Opt-in requirement not met (user must message you first)');
    console.log('\nNext steps:');
    console.log('1. Check Meta Business Manager > Business Settings > Business Info');
    console.log('2. Verify business verification status');
    console.log('3. Check WhatsApp Account quality rating and restrictions');
    console.log('4. Ensure recipient has sent a message to +15557767997');
}

diagnoseWABA();
