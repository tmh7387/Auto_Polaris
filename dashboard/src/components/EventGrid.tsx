import React from 'react';
import { Activity, Mail, MessageSquare } from 'lucide-react';

interface EventGridProps {
    events: any[];
    onRefresh: () => void;
}

const statusConfig: Record<string, { className: string; label: string }> = {
    NEW: { className: 'status-tag status-tag--cyan', label: 'NEW' },
    EVIDENCE_READY: { className: 'status-tag status-tag--orange', label: 'READY' },
    DRAFTED: { className: 'status-tag status-tag--purple', label: 'DRAFTED' },
    NOTIFIED: { className: 'status-tag status-tag--green', label: 'NOTIFIED' },
};

const EventGrid: React.FC<EventGridProps> = ({ events }) => {
    return (
        <div className="events-table-wrap custom-scrollbar">
            <table className="events-table">
                <thead>
                    <tr>
                        <th>Reference</th>
                        <th>Event Short Desc</th>
                        <th>Date</th>
                        <th>Delivery</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {events.length === 0 ? (
                        <tr>
                            <td colSpan={5}>
                                <div className="events-empty">
                                    <Activity size={56} strokeWidth={1} className="events-empty-icon" />
                                    <p className="events-empty-text">Scanning for anomalies...</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        events.map((event: any) => (
                            <tr key={event.id}>
                                <td>
                                    <a
                                        href={`https://polaris.flightdataservices.com/event/${event.polaris_ref}/`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ref-link"
                                    >
                                        {event.polaris_ref}
                                    </a>
                                </td>
                                <td>{event.event_name}</td>
                                <td style={{ opacity: 0.6 }}>{event.flight_date}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Mail
                                            size={14}
                                            style={{
                                                color: event.email_status === 'DRAFTED'
                                                    ? 'var(--accent-green)'
                                                    : 'var(--text-muted)',
                                            }}
                                        />
                                        <MessageSquare
                                            size={14}
                                            style={{
                                                color: event.whatsapp_status === 'SENT'
                                                    ? 'var(--accent-green)'
                                                    : 'var(--text-muted)',
                                            }}
                                        />
                                    </div>
                                </td>
                                <td>
                                    {(() => {
                                        const cfg = statusConfig[event.analysis_status] || {
                                            className: 'status-tag',
                                            label: event.analysis_status,
                                        };
                                        return <span className={cfg.className}>{cfg.label}</span>;
                                    })()}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default EventGrid;
