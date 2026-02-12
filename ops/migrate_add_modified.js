/**
 * Auto-Polaris: Migration Script
 * Adds 'modified_text' column to 'flight_events' table.
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

    if (!fs.existsSync(dbPath)) {
        console.error("❌ Database not found at:", dbPath);
        process.exit(1);
    }

    console.log(`\nMigrating database at: ${dbPath}`);
    const filebuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(filebuffer);

    try {
        // Check if column exists
        const result = db.exec("PRAGMA table_info(flight_events)");
        const columns = result[0].values.map(row => row[1]);

        if (columns.includes('modified_text')) {
            console.log("⚠️ Column 'modified_text' already exists. Skipping.");
        } else {
            console.log("Adding 'modified_text' column...");
            db.run("ALTER TABLE flight_events ADD COLUMN modified_text TEXT");
            console.log("✅ Column added successfully.");

            // Save changes
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(dbPath, buffer);
            console.log("✅ Database saved.");
        }

    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    } finally {
        db.close();
    }
}

main().catch(console.error);
