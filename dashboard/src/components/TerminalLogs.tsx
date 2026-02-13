import React, { useRef, useEffect } from 'react';
import { Card, Typography } from 'antd';
import { CodeOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TerminalLogsProps {
    logs: { type: string; content: string }[];
}

const logColors: Record<string, string> = {
    error: 'var(--accent-red)',
    system: 'var(--accent-primary)',
    info: 'var(--accent-green)',
};

const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <Card
            title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                        <CodeOutlined style={{ marginRight: 8 }} />
                        LIVE EXECUTION LOGS
                    </span>
                    <span className="pulse-dot pulse-dot--green" />
                </div>
            }
            style={{ height: 380, display: 'flex', flexDirection: 'column' }}
            styles={{
                body: { padding: '12px 16px', flex: 1, overflow: 'hidden' },
            }}
        >
            <div
                ref={scrollRef}
                style={{
                    height: '100%',
                    overflowY: 'auto',
                    fontFamily: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: 'var(--text-secondary)',
                }}
            >
                {logs.length === 0 && (
                    <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 60, fontSize: 12 }}>
                        Waiting for system events...
                    </div>
                )}
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: 2 }}>
                        <Text style={{
                            color: logColors[log.type] || 'var(--text-secondary)',
                            marginRight: 6,
                            fontWeight: 600,
                            fontSize: 10,
                        }}>
                            [{log.type.toUpperCase()}]
                        </Text>
                        <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>{log.content}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default TerminalLogs;
