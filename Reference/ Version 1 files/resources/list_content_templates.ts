import 'dotenv/config';
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });

async function listContentTemplates() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        throw new Error('Credentials missing');
    }

    const client = twilio(accountSid, authToken);

    console.log('\n=== LISTING ALL CONTENT TEMPLATES ===\n');

    try {
        const contents: any[] = await (client as any).content.v1.contents.list({ limit: 50 });

        console.log(`Found ${contents.length} templates:\n`);

        for (const content of contents) {
            console.log(`---`);
            console.log(`Name: ${content.friendlyName}`);
            console.log(`SID: ${content.sid}`);
            console.log(`Language: ${content.language}`);

            // Get detailed info
            try {
                const details: any = await (client as any).content.v1.contents(content.sid).fetch();

                if (details.types && details.types['twilio/text']) {
                    console.log(`Body: ${details.types['twilio/text'].body}`);
                }

                console.log(`Variables: ${JSON.stringify(content.variables || {})}`);
                console.log(`Approval Status: ${details.approvalRequests?.whatsapp?.status || 'N/A'}`);
            } catch (err: any) {
                console.log(`Could not fetch details: ${err.message}`);
            }

            console.log('');
        }

    } catch (err: any) {
        console.error('Error listing templates:', err.message);
    }
}

listContentTemplates();
