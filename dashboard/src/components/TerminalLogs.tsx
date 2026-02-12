import React, { useRef, useEffect } from 'react';
import { Card, Typography } from 'antd';
import { CodeOutlined } from '@ant-design/icons';

const { Text } = Typography;

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

    return (
        <Card
            title={<><CodeOutlined /> LIVE EXECUTION LOGS</>}
            style={{
                background: '#0a0a0c',
                border: '1px solid #2d2d34',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                height: '400px',
                display: 'flex',
                flexDirection: 'column'
            }}
            styles={{
                body: { padding: '12px', flex: 1, overflow: 'hidden' },
                header: { borderBottom: '1px solid #2d2d34', color: '#1890ff' }
            }}
        >
            <div
                ref={scrollRef}
                style={{
                    height: '100%',
                    overflowY: 'auto',
                    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#d1d1d1'
                }}
            >
                {logs.length === 0 && <div style={{ color: '#4a4a4e', textAlign: 'center', marginTop: '40px' }}>Waiting for system events...</div>}
                {logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: '4px' }}>
                        <Text style={{
                            color: log.type === 'error' ? '#ff4d4f' : log.type === 'system' ? '#1890ff' : '#52c41a',
                            marginRight: '8px',
                            fontWeight: 'bold'
                        }}>
                            [{log.type.toUpperCase()}]
                        </Text>
                        <Text style={{ color: '#d1d1d1' }}>{log.content}</Text>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default TerminalLogs;
