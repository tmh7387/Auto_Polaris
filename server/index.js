/**
 * Auto-Polaris: Backend Bridge Server
 * Provides API access to SQLite and streams logs via Socket.io
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Serve evidence screenshots as static assets
const EVIDENCE_DIR = path.resolve('evidence_screenshots');
if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
app.use('/api/evidence', express.static(EVIDENCE_DIR));

const DB_PATH = path.resolve('auto_polaris.db');

// Helper to get DB instance
async function getDb() {
    const SQL = await initSqlJs();
    if (!fs.existsSync(DB_PATH)) return null;
    const filebuffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(filebuffer);
}

// Routes
app.get('/api/events', async (req, res) => {
    try {
        const db = await getDb();
        if (!db) return res.json([]);

        // Query events with notification status summary
        const stmt = db.prepare(`
            SELECT 
                fe.*, 
                f.tail_number, 
                f.flight_date, 
                f.departure_time,
                (SELECT status FROM notification_log WHERE event_id = fe.id AND channel = 'EMAIL' ORDER BY sent_at DESC LIMIT 1) as email_status,
                (SELECT status FROM notification_log WHERE event_id = fe.id AND channel = 'WHATSAPP' ORDER BY sent_at DESC LIMIT 1) as whatsapp_status,
                fe.modified_text
            FROM flight_events fe
            JOIN flights f ON fe.flight_id = f.id
            WHERE fe.polaris_status = 'PENDING'
            ORDER BY fe.id DESC
        `);
        const events = [];
        while (stmt.step()) {
            events.push(stmt.getAsObject());
        }
        stmt.free();
        db.close();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ingestion History
app.get('/api/imports', async (req, res) => {
    try {
        const db = await getDb();
        if (!db) return res.json([]);
        const stmt = db.prepare(`
            SELECT * FROM data_imports ORDER BY imported_at DESC
        `);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        db.close();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notification Logs
app.get('/api/notifications', async (req, res) => {
    try {
        const db = await getDb();
        if (!db) return res.json([]);
        const stmt = db.prepare(`
            SELECT 
                nl.*,
                fe.polaris_ref,
                fe.event_name,
                f.tail_number,
                f.flight_date
            FROM notification_log nl
            LEFT JOIN flight_events fe ON nl.event_id = fe.id
            LEFT JOIN flights f ON fe.flight_id = f.id
            ORDER BY nl.sent_at DESC
        `);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        db.close();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Run commands and stream logs
function runCommand(command, args, socket) {
    return new Promise((resolve) => {
        const process = spawn(command, args, { shell: true });

        process.stdout.on('data', (data) => {
            const line = data.toString();
            socket.emit('log', { type: 'info', content: line });
            console.log(line);
        });

        process.stderr.on('data', (data) => {
            const line = data.toString();
            socket.emit('log', { type: 'error', content: line });
            console.error(line);
        });

        process.on('close', (code) => {
            socket.emit('log', { type: 'system', content: `Process exited with code ${code}` });
            resolve(code);
        });
    });
}

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('run-scraping', () => {
        console.log('Triggering Scraper (HEADED)...');
        runCommand('npx', ['playwright', 'test', 'resources/brazos_workflow.spec.ts', '--headed', '--reporter=line'], socket);
    });

    socket.on('run-ingestion', () => {
        console.log('Triggering Ingestion...');
        runCommand('node', ['ops/ingest_csv.js'], socket);
    });

    socket.on('run-capture', () => {
        console.log('Triggering Capture (HEADED)...');
        runCommand('npx', ['playwright', 'test', 'resources/notification_generator.spec.ts', '--headed'], socket);
    });

    socket.on('run-notifications', () => {
        console.log('Triggering Notifications (HEADED)...');
        runCommand('npx', ['playwright', 'test', 'resources/outlook_draft_generator.spec.ts', '--headed'], socket);
        runCommand('node', ['resources/whatsapp_twilio_sender.ts'], socket);
    });

    socket.on('run-full-workflow', async () => {
        console.log('🚀 Triggering FULL AUTOMATED WORKFLOW...');
        socket.emit('log', { type: 'system', content: '🚀 STARTING FULL AUTOMATED WORKFLOW' });

        // Step 1: Scrape
        socket.emit('log', { type: 'system', content: 'Phase 1/5: Scraping Polaris...' });

        // Record CSV count before scraping to detect if a new one was created
        const csvDir = 'input_csvs';
        const csvsBefore = fs.existsSync(csvDir) ? fs.readdirSync(csvDir).length : 0;

        const scrapeCode = await runCommand('npx', ['playwright', 'test', 'resources/brazos_workflow.spec.ts', '--headed', '--reporter=line'], socket);

        // Check if scraping produced a new CSV
        const csvsAfter = fs.existsSync(csvDir) ? fs.readdirSync(csvDir).length : 0;
        const newCsvProduced = csvsAfter > csvsBefore;

        if (!newCsvProduced) {
            // Close notified events — they're no longer pending in Polaris
            try {
                const db = await getDb();
                if (db) {
                    const countStmt = db.prepare(`SELECT COUNT(*) as cnt FROM flight_events WHERE analysis_status = 'NOTIFIED' AND polaris_status = 'PENDING'`);
                    countStmt.step();
                    const { cnt } = countStmt.getAsObject();
                    countStmt.free();

                    if (cnt > 0) {
                        db.run(`UPDATE flight_events SET polaris_status = 'CLOSED' WHERE analysis_status = 'NOTIFIED' AND polaris_status = 'PENDING'`);
                        // Persist changes back to disk
                        const data = db.export();
                        const buffer = Buffer.from(data);
                        fs.writeFileSync(DB_PATH, buffer);
                        socket.emit('log', { type: 'system', content: `🗄️ Closed ${cnt} previously notified event(s) — no longer pending in Polaris.` });
                        console.log(`Closed ${cnt} notified events`);
                    }
                    db.close();
                }
            } catch (closeErr) {
                console.error('Close step failed (non-fatal):', closeErr.message);
                socket.emit('log', { type: 'error', content: `Close step failed: ${closeErr.message}` });
            }

            socket.emit('log', { type: 'system', content: '📋 No new events found in Polaris. Workflow complete — nothing to process.' });
            socket.emit('workflow-complete');
            console.log('✅ WORKFLOW COMPLETED (no new events)');
            return;
        }

        // Step 2: Ingest
        socket.emit('log', { type: 'system', content: 'Phase 2/5: Ingesting Data...' });
        await runCommand('node', ['ops/ingest_csv.js'], socket);

        // Step 3: Capture
        socket.emit('log', { type: 'system', content: 'Phase 3/5: Capturing Evidence...' });
        await runCommand('npx', ['playwright', 'test', 'resources/notification_generator.spec.ts', '--headed', '--reporter=line'], socket);

        // Step 4: Draft
        socket.emit('log', { type: 'system', content: 'Phase 4/5: Generating Drafts...' });
        await runCommand('npx', ['playwright', 'test', 'resources/outlook_draft_generator.spec.ts', '--headed', '--reporter=line'], socket);

        // Step 5: Notify
        socket.emit('log', { type: 'system', content: 'Phase 5/5: Sending WhatsApp Notifications...' });
        await runCommand('npx', ['ts-node', '--esm', 'resources/whatsapp_twilio_sender.ts'], socket);

        socket.emit('log', { type: 'system', content: '✅ FULL WORKFLOW COMPLETED SUCCESSFULLY' });
        socket.emit('workflow-complete');
        console.log('✅ FULL WORKFLOW COMPLETED');
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Bridge server binding to all interfaces on port ${PORT}`);
    console.log(`📡 Access via http://localhost:${PORT} or machine IP`);
});
