import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkMessageStatus() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messageSid = 'MM4e9dc6f6d685f69cdaa5070f8f28118e';

    if (!accountSid || !authToken) {
        console.error('Twilio credentials missing.');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log(`--- Checking Message Status for SID: ${messageSid} ---`);
    try {
        const message = await client.messages(messageSid).fetch();
        console.log(`Status: ${message.status}`);
        console.log(`Error Code: ${message.errorCode}`);
        console.log(`Error Message: ${message.errorMessage}`);
        console.log(`Price: ${message.price} ${message.priceUnit}`);
        console.log(`To: ${message.to}`);
        console.log(`From: ${message.from}`);

    } catch (err) {
        console.error('Error fetching message status:', err);
    }
}

checkMessageStatus();
