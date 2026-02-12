/**
 * Auto-Polaris: WhatsApp Notification Engine (Twilio)
 * Level 3: Resources
 * Refactored V2 (Local-First): Matches Version 1 Logic and Variable Mapping.
 */

import dotenv from 'dotenv';
dotenv.config({ path: 'env/.env' });
import fs from 'fs';
import path from 'path';
import twilio from 'twilio';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    dbPath: path.resolve('auto_polaris.db'),
    polarisBaseUrl: 'https://polaris.flightdataservices.com'
};

async function sendWhatsAppNotifications() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const toNumber = process.env.TWILIO_WHATSAPP_TO;
    const contentSid = process.env.TWILIO_CONTENT_SID;

    // V1 Validation Logic: Requires either From Number OR Messaging Service SID
    if (!accountSid || !authToken || (!fromNumber && !messagingServiceSid) || !toNumber) {
        const missing = [];
        if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
        if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
        if (!fromNumber && !messagingServiceSid) missing.push('TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID');
        if (!toNumber) missing.push('TWILIO_WHATSAPP_TO');
        throw new Error(`Missing Twilio credentials in .env: ${missing.join(', ')}`);
    }

    console.log('--- WHATSAPP SENDER V2 (V1 Logic) START ---');

    // 1. Load Database and Query 'DRAFTED' Events
    const SQL = await initSqlJs();
    if (!fs.existsSync(CONFIG.dbPath)) {
        throw new Error(`Database not found at ${CONFIG.dbPath}`);
    }
    const filebuffer = fs.readFileSync(CONFIG.dbPath);
    const db = new SQL.Database(filebuffer);

    console.log(`Querying DRAFTED events from ${CONFIG.dbPath}...`);

    // Attempt to select event_code if it exists, otherwise handle gracefully
    let stmt;
    try {
        stmt = db.prepare(`
            SELECT fe.*, f.tail_number, f.flight_date, f.departure_time 
            FROM flight_events fe
            JOIN flights f ON fe.flight_id = f.id
            WHERE fe.analysis_status = 'DRAFTED'
        `);
    } catch (e) {
        console.error("Error preparing statement:", e);
        db.close();
        return;
    }

    const events: any[] = [];
    while (stmt.step()) {
        events.push(stmt.getAsObject());
    }
    stmt.free();

    console.log(`Found ${events.length} events to notify.`);

    if (events.length === 0) {
        console.log('No events to notify.');
        db.close();
        return;
    }

    const client = twilio(accountSid, authToken);

    for (const event of events) {
        const ref = event.polaris_ref;
        const flightUrl = `${CONFIG.polarisBaseUrl}/flight/${ref}/`;

        // Helper to format date like "Feb 03, 2026"
        const formatDate = (dateStr: string) => {
            if (!dateStr || dateStr === "-") return "-";
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
            } catch (e) {
                return dateStr;
            }
        };

        // V1 Variable Mapping
        const eventCode = event.event_code || event.event_name || "-";
        const eventDesc = event.event_name || "-";
        const eventDate = formatDate(event.flight_date || event.departure_time);
        const msgUrl = flightUrl || "-";

        console.log(`Sending WhatsApp for Event ID ${event.id} (Ref: ${ref})...`);

        // Ensure 'whatsapp:' prefix is present for Sandbox/Numbers
        const formatNumber = (num: string | undefined) => num && !num.startsWith('whatsapp:') ? `whatsapp:${num}` : num;
        const fromFormatted = formatNumber(fromNumber);
        const toFormatted = formatNumber(toNumber);

        try {
            let sid;
            if (contentSid) {
                console.log(`  Sending via Content API (Template: ${contentSid})...`);
                // Template: "Hi WESTPAC FDM Team, BSS has identified Level 3 event – {{1}} - {{2}} - {{3}}. The link to the event is below: {{4}}"
                const message = await client.messages.create({
                    contentSid: contentSid,
                    contentVariables: JSON.stringify({
                        "1": eventCode, // Code
                        "2": eventDesc, // Desc
                        "3": eventDate, // Date (Formatted)
                        "4": msgUrl     // URL
                    }),
                    messagingServiceSid: messagingServiceSid ? messagingServiceSid : undefined,
                    from: messagingServiceSid ? undefined : fromFormatted as string,
                    to: toFormatted as string
                });
                sid = message.sid;
            } else {
                console.log(`  Sending via Sandbox Body (Fallback)...`);
                // Match Guide Text Exactly
                const body = `Hi WESTPAC FDM Team, BSS has identified Level 3 event – ${eventCode} - ${eventDesc} - ${eventDate}. The link to the event is below: ${msgUrl}`;
                const message = await client.messages.create({
                    body: body,
                    messagingServiceSid: messagingServiceSid ? messagingServiceSid : undefined,
                    from: messagingServiceSid ? undefined : fromFormatted as string,
                    to: toFormatted as string
                });
                sid = message.sid;
            }

            console.log(`  ✓ SID: ${sid}`);

            // Update DB Status and Log
            db.run("UPDATE flight_events SET analysis_status = 'NOTIFIED' WHERE id = ?", [event.id]);
            db.run(`
                INSERT INTO notification_log (event_id, channel, status) 
                VALUES (?, 'WHATSAPP', 'SENT')
            `, [event.id]);

        } catch (err) {
            console.error(`  X Failed for Event ID ${event.id}:`, err);
        }
    }

    // Save Database changes
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(CONFIG.dbPath, buffer);
        console.log('Database updated with NOTIFIED status.');
    } catch (e) {
        console.error("Failed to save database:", e);
    }

    db.close();
    console.log('--- WHATSAPP SENDER V2 DONE ---');
    process.exit(0);
}

sendWhatsAppNotifications().catch(console.error);
