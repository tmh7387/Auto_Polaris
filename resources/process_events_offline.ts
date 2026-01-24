
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

const CONFIG = {
    inputCsv: path.resolve('resources/brazos_pending_events.csv'),
    outputLog: path.resolve('resources/event_processing_log.json'),
    timezone: 'Australia/Sydney',
    dayStartHour: 6,
    dayEndHour: 18,
    urlTemplate: 'https://polaris.flightdataservices.com/flight/{REF}/'
};

function parseCsv(content: string): CsvRecord[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    // Handle CSV quoting basics (simplified, assumes no commas in unquoted fields for now given sample)
    // For robust parsing we'd use a library, but sticking to native for simplicity unless it breaks.
    // The previous sample showed quotes around comments: "3 days, 15 hours ago"

    // Better Regex Split for CSV:
    const splitCsvRow = (row: string) => {
        const matches = row.match(/(".*?"|[^",\s]+|(?<=,)|(?<=^))(?:,|$)/g);
        return matches ? matches.map(m => m.replace(/,$/, '').replace(/^"|"$/g, '').trim()) : [];
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
        // Format from CSV: 2026-01-16 13:04:20Z
        const utcDate = new Date(rec['Event Datetime']);

        // Convert to Sydney Time
        // Note: Node's Intl support depends on version/ICU, usually fine for major TZs
        const options: Intl.DateTimeFormatOptions = {
            timeZone: CONFIG.timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        };
        const localDateString = new Intl.DateTimeFormat('en-AU', options).format(utcDate);

        // Extract Hour for Day/Night
        // Local String format approx: "16/01/2026, 23:04:20" (depends on locale)
        // Let's get parts to be safe
        const parts = new Intl.DateTimeFormat('en-US', { ...options, hour12: false }).formatToParts(utcDate);
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
