import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkStatus(sid: string) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);

    const message = await client.messages(sid).fetch();
    console.log(`SID: ${message.sid}`);
    console.log(`Status: ${message.status}`);
    console.log(`Error Code: ${message.errorCode}`);
    console.log(`Error Message: ${message.errorMessage}`);
    console.log(`To: ${message.to}`);
}

const targetSid = process.argv[2];
if (!targetSid) {
    console.error('Please provide a message SID');
    process.exit(1);
}

checkStatus(targetSid).catch(console.error);
