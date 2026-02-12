
import * as fs from 'fs';
import * as path from 'path';

// Types
interface CsvRecord {
    Reference: string;
    'Flight Number': string;
    Fleet: string;
    Aircraft: string;
    'Takeoff IATA': string;
    'Landing IATA': string;
    Level: string;
    'Event Short Desc': string;
    'Event Datetime': string;
    [key: string]: string; // Flex for other columns
}

interface EnrichedEvent {
    reference: string;
    flight_number: string;
    fleet: string;
    aircraft: string;
    date_utc: string;
    date_local: string; // Australia/Sydney
    lighting_condition: 'Day' | 'Night';
    event_url: string;
    severity_level: string;
    description: string;
    process_status: 'Pending' | 'Processed';
    email_sent_at?: string;
}

// Helper to find the latest CSV in input_csvs
function getLatestScrapedCsv(): string {
    const inputDir = path.resolve('input_csvs');
    if (!fs.existsSync(inputDir)) return path.resolve('resources/brazos_pending_events.csv');

    const files = fs.readdirSync(inputDir)
        .filter(f => f.endsWith('.csv'))
        .map(f => ({ name: f, time: fs.statSync(path.join(inputDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
        return path.join(inputDir, files[0].name);
    }

    return path.resolve('resources/brazos_pending_events.csv');
}

const CONFIG = {
    inputCsv: getLatestScrapedCsv(),
    outputLog: path.resolve('resources/event_processing_log.json'),
    timezone: 'Australia/Sydney',
    dayStartHour: 6,
    dayEndHour: 18,
    urlTemplate: 'https://polaris.flightdataservices.com/flight/{REF}/'
};

function parseCsv(content: string): CsvRecord[] {
    // Strip UTF-8 BOM if present
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.trim().split('\n');
    if (lines.length === 0) return [];

    // Split headers and clean them
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    console.log('Detected Headers:', headers.join(' | '));

    // Better Regex Split for CSV:
    const splitCsvRow = (row: string) => {
        // Handle quoted fields correctly and allow spaces in unquoted fields
        const matches = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                matches.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        matches.push(current.trim()); // Push last field

        return matches.map(m => m.replace(/^"|"$/g, '').trim());
    };

    const records: CsvRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = splitCsvRow(lines[i]);
        const record: any = {};
        headers.forEach((h, index) => {
            record[h] = values[index] || '';
        });
        records.push(record as CsvRecord);
    }
    return records;
}

function processEvents() {
    console.log(`Reading CSV from: ${CONFIG.inputCsv}`);
    if (!fs.existsSync(CONFIG.inputCsv)) {
        console.error('CSV file not found!');
        return;
    }

    const content = fs.readFileSync(CONFIG.inputCsv, 'utf-8');
    const records = parseCsv(content);
    console.log(`Parsed ${records.length} records.`);

    const enrichedEvents: EnrichedEvent[] = records.map(rec => {
        // Parse UTC Date
        // Format from CSV: 2026-02-09 07:01:03Z
        const rawDate = rec['Event Datetime'];
        const utcDate = new Date(rawDate);

        // Safety check for invalid dates
        if (isNaN(utcDate.getTime())) {
            console.error(`Warning: Invalid date "${rawDate}" for record ${rec['Reference']}. Using current time.`);
        }
        const safeDate = isNaN(utcDate.getTime()) ? new Date() : utcDate;

        // Convert to Sydney Time
        const options: Intl.DateTimeFormatOptions = {
            timeZone: CONFIG.timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        };
        const localDateString = new Intl.DateTimeFormat('en-AU', options).format(safeDate);

        // Extract Hour for Day/Night
        const parts = new Intl.DateTimeFormat('en-US', { ...options, hour12: false }).formatToParts(safeDate);
        const hourPart = parts.find(p => p.type === 'hour');
        const hour = hourPart ? parseInt(hourPart.value, 10) : 0;

        const isDay = hour >= CONFIG.dayStartHour && hour < CONFIG.dayEndHour;

        return {
            reference: rec['Reference'],
            flight_number: rec['Flight Number'],
            fleet: rec['Fleet'],
            aircraft: rec['Aircraft'],
            date_utc: rec['Event Datetime'],
            date_local: localDateString,
            lighting_condition: isDay ? 'Day' : 'Night',
            event_url: CONFIG.urlTemplate.replace('{REF}', rec['Reference']),
            severity_level: rec['Level'],
            description: rec['Event Short Desc'],
            process_status: 'Pending'
        };
    });

    console.log(`Writing ${enrichedEvents.length} enriched events to log.`);
    fs.writeFileSync(CONFIG.outputLog, JSON.stringify(enrichedEvents, null, 2));

    // Sample Output
    if (enrichedEvents.length > 0) {
        console.log('Sample Enriched Event:', enrichedEvents[0]);
    }
}

processEvents();
