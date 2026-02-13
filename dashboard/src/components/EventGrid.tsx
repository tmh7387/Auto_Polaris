import React from 'react';
import { Table, Space, Tooltip, Typography } from 'antd';
import { MailOutlined, WhatsAppOutlined } from '@ant-design/icons';

const { Text } = Typography;

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
    const columns = [
        {
            title: 'Reference',
            dataIndex: 'polaris_ref',
            key: 'ref',
            width: 100,
            render: (text: string) => (
                <a
                    href={`https://polaris.flightdataservices.com/event/${text}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono-data"
                    style={{ color: 'var(--accent-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                    {text}
                </a>
            ),
        },
        {
            title: 'Event Short Desc',
            dataIndex: 'event_name',
            key: 'event',
            ellipsis: true,
            render: (text: string) => (
                <Text style={{ color: 'var(--text-primary)', fontSize: 13 }}>{text}</Text>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'flight_date',
            key: 'date',
            width: 110,
            render: (text: string) => (
                <Text className="mono-data" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{text}</Text>
            ),
        },
        {
            title: 'Delivery',
            key: 'delivery',
            width: 70,
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Space size={4}>
                    <Tooltip title={`Email: ${record.email_status || 'PENDING'}`}>
                        <MailOutlined style={{
                            color: record.email_status === 'DRAFTED' ? 'var(--accent-green)' : 'var(--text-tertiary)',
                            fontSize: 14,
                        }} />
                    </Tooltip>
                    <Tooltip title={`WhatsApp: ${record.whatsapp_status || 'PENDING'}`}>
                        <WhatsAppOutlined style={{
                            color: record.whatsapp_status === 'SENT' ? 'var(--accent-green)' : 'var(--text-tertiary)',
                            fontSize: 14,
                        }} />
                    </Tooltip>
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'analysis_status',
            key: 'status',
            width: 90,
            align: 'center' as const,
            render: (status: string) => {
                const cfg = statusConfig[status] || { className: 'status-tag', label: status };
                return <span className={cfg.className}>{cfg.label}</span>;
            },
        },
    ];

    return (
        <Table
            dataSource={events}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 8, size: 'small' }}
            size="small"
            style={{ background: 'transparent' }}
        />
    );
};

export default EventGrid;
