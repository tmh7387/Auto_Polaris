import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function checkTemplate() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const contentSid = 'HXb5b62575e6e4ff6129ad7c8efe1f983e'; // Current Sandbox template

    if (!accountSid || !authToken) {
        throw new Error('Credentials missing');
    }

    const client = twilio(accountSid, authToken);

    console.log('\n=== CURRENT SANDBOX TEMPLATE ===\n');

    try {
        const template: any = await (client as any).content.v1.contents(contentSid).fetch();

        console.log(`Name: ${template.friendlyName}`);
        console.log(`SID: ${template.sid}`);
        console.log(`Language: ${template.language}`);
        console.log('\nTemplate Structure:');
        console.log(JSON.stringify(template.types, null, 2));

    } catch (err: any) {
        console.error('Error:', err.message);
    }

    console.log('\n\n=== CHECKING FOR FLIGHT NOTIFICATION TEMPLATE ===\n');

    // Check if there's a better template
    try {
        const contents: any[] = await (client as any).content.v1.contents.list({ limit: 50 });

        for (const content of contents) {
            if (content.friendlyName.toLowerCase().includes('westpac') ||
                content.friendlyName.toLowerCase().includes('flight') ||
                content.friendlyName.toLowerCase().includes('brazos') ||
                content.friendlyName.toLowerCase().includes('fdm')) {

                console.log(`Found potential match: ${content.friendlyName}`);
                console.log(`SID: ${content.sid}`);

                const details: any = await (client as any).content.v1.contents(content.sid).fetch();
                if (details.types && details.types['twilio/text']) {
                    console.log(`Body: ${details.types['twilio/text'].body}`);
                }
                console.log('---\n');
            }
        }

    } catch (err: any) {
        console.error('Error searching templates:', err.message);
    }
}

checkTemplate();
