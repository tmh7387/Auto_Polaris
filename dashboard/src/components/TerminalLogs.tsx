import React, { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface TerminalLogsProps {
    logs: { type: string; content: string }[];
}

const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const getContentClass = (type: string) => {
        switch (type) {
            case 'system': return 'log-line-content log-line-content--system';
            case 'error': return 'log-line-content log-line-content--error';
            case 'info': return 'log-line-content log-line-content--info';
            default: return 'log-line-content log-line-content--default';
        }
    };

    return (
        <div className="aero-panel terminal-panel">
            <div className="aero-panel-header" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Terminal size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="aero-panel-label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
                        Execution Logs
                    </span>
                </div>
                <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent-green)',
                    boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)',
                }} />
            </div>
            <div ref={scrollRef} className="terminal-body custom-scrollbar">
                {logs.length === 0 ? (
                    <div className="terminal-empty">
                        Waiting for system events...
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="log-line">
                            <span className="log-line-number">{i + 1}</span>
                            <span className={getContentClass(log.type)}>
                                {log.content}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TerminalLogs;
