import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

interface ExecutionLogsPageProps {
    logs: { type: string; content: string }[];
    onClear: () => void;
}

const ExecutionLogsPage: React.FC<ExecutionLogsPageProps> = ({ logs, onClear }) => {
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
        <div style={{ padding: 32, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="aero-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="aero-panel-header">
                    <div className="aero-panel-header-title">
                        <div
                            className="aero-panel-icon"
                            style={{ background: 'rgba(167, 139, 250, 0.10)' }}
                        >
                            <Terminal size={16} style={{ color: 'var(--accent-purple)' }} />
                        </div>
                        <span className="aero-panel-label">Execution Logs</span>
                    </div>
                    <div className="aero-panel-meta" style={{ gap: 12 }}>
                        <span>{logs.length} entries</span>
                        <button
                            onClick={onClear}
                            className="exec-logs-clear-btn"
                            title="Clear logs"
                        >
                            <Trash2 size={12} />
                            Clear
                        </button>
                    </div>
                </div>
                <div ref={scrollRef} className="exec-logs-body custom-scrollbar">
                    {logs.length === 0 ? (
                        <div className="exec-logs-empty">
                            <Terminal size={32} strokeWidth={1} />
                            <span>No execution logs yet</span>
                            <span className="exec-logs-empty-sub">
                                Logs will appear here when you run a workflow
                            </span>
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
        </div>
    );
};

export default ExecutionLogsPage;
