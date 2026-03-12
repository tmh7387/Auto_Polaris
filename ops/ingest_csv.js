/**
 * Auto-Polaris: Data Ingester
 * Level 2: Operations
 * Reads CSV files from 'input_csvs/', upserts flights/events, and archives the file.
 * This version uses ESM and the 'sql.js' (WebAssembly) package.
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    dbPath: path.join(__dirname, '../auto_polaris.db'),
    inputDir: path.join(__dirname, '../input_csvs'),
    archiveDir: path.join(__dirname, '../archive')
};

const SCHEMA = `
    CREATE TABLE IF NOT EXISTS data_imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        row_count INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS flights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tail_number TEXT NOT NULL,
        flight_date TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        from_airport TEXT,
        to_airport TEXT,
        UNIQUE(tail_number, flight_date, departure_time)
    );
    CREATE TABLE IF NOT EXISTS flight_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flight_id INTEGER NOT NULL,
        polaris_ref TEXT NOT NULL UNIQUE,
        event_name TEXT NOT NULL,
        severity_level TEXT NOT NULL,
        parameter_value TEXT,
        analysis_status TEXT DEFAULT 'NEW',
        polaris_status TEXT DEFAULT 'PENDING',
        evidence_path TEXT,
        modified_text TEXT,
        event_code TEXT,
        threshold_value TEXT,
        FOREIGN KEY(flight_id) REFERENCES flights(id)
    );
    CREATE TABLE IF NOT EXISTS notification_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        channel TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'SENT',
        FOREIGN KEY(event_id) REFERENCES flight_events(id)
    );
`;

async function main() {
    const SQL = await initSqlJs();

    // Ensure archive dir exists
    if (!fs.existsSync(CONFIG.archiveDir)) {
        fs.mkdirSync(CONFIG.archiveDir, { recursive: true });
    }

    const files = fs.readdirSync(CONFIG.inputDir).filter(f => f.endsWith('.csv'));

    if (files.length === 0) {
        console.log("No CSV files found in input_csvs/.");
        return;
    }

    // Load existing database if it exists, or auto-initialize
    let db;
    if (fs.existsSync(CONFIG.dbPath)) {
        const filebuffer = fs.readFileSync(CONFIG.dbPath);
        db = new SQL.Database(filebuffer);
    } else {
        console.log("⚠️ Database not found — auto-initializing schema...");
        db = new SQL.Database();
        db.run(SCHEMA);
        console.log("✅ Database schema created.");
    }

    // PHASE 6: Status Sync - Mark all as CLOSED initially
    console.log("🔄 Synchronizing status: Marking all current events as CLOSED...");
    db.run("UPDATE flight_events SET polaris_status = 'CLOSED'");

    for (const filename of files) {
        await processFile(db, filename);
    }

    // Save database back to disk
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(CONFIG.dbPath, buffer);

    db.close();
}

async function processFile(db, filename) {
    console.log(`\nProcessing: ${filename}`);

    const filePath = path.join(CONFIG.inputDir, filename);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    let records;
    try {
        records = parse(content, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
    } catch (err) {
        console.error(`❌ Error parsing CSV ${filename}:`, err.message);
        return;
    }

    if (records.length === 0) {
        console.log(`⚠️  File ${filename} is empty. Skipping.`);
        return;
    }

    // Check if already imported
    const checkImportStmt = db.prepare('SELECT id FROM data_imports WHERE filename = :filename');
    const checkImport = checkImportStmt.getAsObject({ ':filename': filename });
    checkImportStmt.free();

    if (checkImport.id) {
        console.log(`⚠️  File ${filename} already processed. Skipping.`);
        return;
    }

    console.log(`Found ${records.length} records.`);
    let importedCount = 0;

    try {
        for (const row of records) {
            // Log column names once to debug if Reference is missing
            if (importedCount === 0) {
                console.log("  Columns found:", Object.keys(row).join(', '));
            }

            const ref = row['Reference'];
            const aircraft = row['Aircraft'];
            const eventDatetime = row['Event Datetime'];

            if (!ref || !aircraft || !eventDatetime) {
                console.warn(`  ! Missing required fields (Ref: ${ref}, Aircraft: ${aircraft}, DT: ${eventDatetime}). Skipping row.`);
                continue;
            }

            console.log(`  -> Row: ${ref} | ${aircraft} | ${eventDatetime}`);

            const dtParts = eventDatetime.split(' ');
            const datePart = dtParts[0];
            const timePart = dtParts[1] ? dtParts[1].substring(0, 5) : '00:00';

            // Upsert Flight
            db.run(`
                INSERT OR IGNORE INTO flights (tail_number, flight_date, departure_time)
                VALUES (?, ?, ?)
            `, [aircraft, datePart, timePart]);

            const getFlightIdStmt = db.prepare(`
                SELECT id FROM flights 
                WHERE tail_number = :tail AND flight_date = :date AND departure_time = :time
            `);
            const flight = getFlightIdStmt.getAsObject({ ':tail': aircraft, ':date': datePart, ':time': timePart });
            getFlightIdStmt.free();

            const flightId = flight.id;
            if (!flightId) {
                console.error(`  ❌ Failed to get/create flight ID for ${aircraft} at ${datePart} ${timePart}`);
                continue;
            }

            // Insert Event (Using INSERT OR REPLACE to update polaris_status to PENDING if already exists)
            db.run(`
                INSERT INTO flight_events (flight_id, polaris_ref, event_name, severity_level, parameter_value, polaris_status, event_code, modified_text, threshold_value)
                VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
                ON CONFLICT(polaris_ref) DO UPDATE SET polaris_status = 'PENDING', event_code = excluded.event_code, modified_text = excluded.modified_text, threshold_value = excluded.threshold_value
            `, [flightId, ref, row['Event Short Desc'] || 'Unknown', row['Level'] || 'Unknown', row['Value'] || '', row['Code'] || '-', row['Modified'] || '', row['Threshold'] || '']);

            importedCount++;
        }

        db.run('INSERT INTO data_imports (filename, row_count) VALUES (?, ?)', [filename, records.length]);

        // 2. Archive the file
        const archivePath = path.join(CONFIG.archiveDir, filename);
        fs.renameSync(filePath, archivePath);
        console.log(`✅ Finished ${filename}. Imported ${importedCount} events. Archived to archive/.`);

    } catch (err) {
        console.error(`❌ Error processing rows in ${filename}:`, err);
    }
}

main().catch(err => console.error("Fatal error:", err));
