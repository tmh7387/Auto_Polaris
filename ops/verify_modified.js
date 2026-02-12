import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, '../auto_polaris.db');
    const filebuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(filebuffer);

    const stmt = db.prepare("SELECT polaris_ref, event_name, modified_text FROM flight_events ORDER BY id DESC LIMIT 5");
    console.log("Checking recent events for 'modified_text'...");
    while (stmt.step()) {
        const row = stmt.getAsObject();
        console.log(JSON.stringify(row, null, 2));
    }
    stmt.free();
    db.close();
}

main();
