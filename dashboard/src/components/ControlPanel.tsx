import React, { useState } from 'react';
import { Card, Button, Space, Tooltip, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { Socket } from 'socket.io-client';

const { Text } = Typography;

interface ControlPanelProps {
    socket: Socket | null;
    onRefresh: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ socket, onRefresh }) => {
    const [loading, setLoading] = useState<string | null>(null);

    React.useEffect(() => {
        if (!socket) return;
        socket.on('workflow-complete', () => {
            setLoading(null);
            onRefresh();
        });
        return () => { socket.off('workflow-complete'); };
    }, [socket, onRefresh]);

    const trigger = (event: string, actionName: string) => {
        if (!socket) return;
        setLoading(actionName);
        socket.emit(event);
        if (actionName !== 'full') {
            setTimeout(() => { setLoading(null); onRefresh(); }, 10000);
        }
    };

    return (
        <Card
            title={
                <span>
                    <ThunderboltOutlined style={{ color: 'var(--accent-primary)', marginRight: 8 }} />
                    OPERATION CONTROL
                </span>
            }
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {/* Workflow Button */}
                <Tooltip title="Scrape, Ingest, Capture, and Notify in one click">
                    <Button
                        block
                        type="primary"
                        size="large"
                        className="workflow-btn"
                        icon={<ThunderboltOutlined spin={loading === 'full'} />}
                        onClick={() => trigger('run-full-workflow', 'full')}
                        disabled={!!loading}
                        style={{ height: 56, fontSize: 14 }}
                    >
                        RUN WORKFLOW
                    </Button>
                </Tooltip>

                {/* System Status */}
                <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        System Status:{' '}
                        <Text className="mono-data" style={{
                            color: socket ? 'var(--accent-green)' : 'var(--accent-red)',
                            fontWeight: 600,
                        }}>
                            {socket ? 'CONNECTED' : 'OFFLINE'}
                        </Text>
                    </Text>
                </div>
            </Space>
        </Card>
    );
};

export default ControlPanel;
