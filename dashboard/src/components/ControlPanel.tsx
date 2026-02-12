import React, { useState } from 'react';
import { Card, Button, Space, Tooltip, Typography, Divider } from 'antd';
import {
    SyncOutlined,
    CameraOutlined,
    NotificationOutlined,
    ThunderboltOutlined,
    RocketOutlined
} from '@ant-design/icons';
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

        return () => {
            socket.off('workflow-complete');
        };
    }, [socket, onRefresh]);

    const trigger = (event: string, actionName: string) => {
        if (!socket) return;
        setLoading(actionName);
        socket.emit(event);

        // Safety timeout for manual steps, but 'full' relies on workflow-complete
        if (actionName !== 'full') {
            setTimeout(() => {
                setLoading(null);
                onRefresh();
            }, 10000);
        }
    };

    return (
        <Card
            title={<><ThunderboltOutlined style={{ color: '#faad14' }} /> OPERATION CONTROL</>}
            style={{
                background: '#141418',
                border: '1px solid #2d2d34',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
            styles={{ header: { borderBottom: '1px solid #2d2d34', color: '#fff' } }}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Tooltip title="Scrape, Ingest, Capture, and Notify in one click">
                    <Button
                        block
                        type="primary"
                        size="large"
                        icon={<ThunderboltOutlined spin={loading === 'full'} />}
                        onClick={() => trigger('run-full-workflow', 'full')}
                        disabled={!!loading}
                        style={{
                            height: '64px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            background: 'linear-gradient(90deg, #1d39c4 0%, #722ed1 100%)',
                            border: 'none'
                        }}
                    >
                        RUN WORKFLOW
                    </Button>
                </Tooltip>



                <Divider style={{ borderColor: '#2d2d34', margin: '12px 0' }} />

                <div style={{ textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        System Status: <Text style={{ color: socket ? '#52c41a' : '#ff4d4f' }}>{socket ? 'CONNECTED' : 'OFFLINE'}</Text>
                    </Text>
                </div>
            </Space>
        </Card>
    );
};

export default ControlPanel;
