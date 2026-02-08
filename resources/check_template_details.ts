import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkTemplateBody() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const contentSid = 'HX1a8db11b0facd9e27ffb582c3e2184b7';

    if (!accountSid || !authToken) {
        console.error('Twilio credentials missing.');
        return;
    }

    const client = twilio(accountSid, authToken);

    console.log(`\n--- Checking Content Template: ${contentSid} ---`);
    try {
        const t = await (client as any).content.v1.contents(contentSid).fetch();
        console.log(`Friendly Name: ${t.friendlyName}`);
        console.log(`Types: ${JSON.stringify(t.types, null, 2)}`);

        // Let's try to get more details if possible
    } catch (err: any) {
        console.error('Error fetching template:', err.message);
    }
}

checkTemplateBody();
