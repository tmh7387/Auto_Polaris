/**
 * Auto-Polaris: Database Initializer (SQLite)
 * Level 2: Operations
 * Run this once to create the 'auto_polaris.db' file.
 * This version uses ESM and the 'sql.js' (WebAssembly) package.
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, '../auto_polaris.db');

    console.log(`\nInitializing database at: ${dbPath}`);

    // Create a new database in memory
    const db = new SQL.Database();

    // 2. Define the Schema
    const schema = `
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
            polaris_ref TEXT NOT NULL UNIQUE,      -- Added UNIQUE for sync
            event_name TEXT NOT NULL,
            severity_level TEXT NOT NULL,
            parameter_value TEXT,
            analysis_status TEXT DEFAULT 'NEW',
            polaris_status TEXT DEFAULT 'PENDING', -- Added for status sync
            evidence_path TEXT,
            modified_text TEXT,                    -- Added for 'Modified' column from CSV
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

    try {
        db.run(schema);
        console.log("✅ Database schema initialized.");

        // Export to file
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log("✅ Database file saved successfully.");

    } catch (err) {
        console.error("❌ Error initializing database:", err.message);
    } finally {
        db.close();
    }
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
