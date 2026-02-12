import React from 'react';
import { Table, Tag, Space, Tooltip } from 'antd';
import {
    MailOutlined,
    WhatsAppOutlined,
} from '@ant-design/icons';

interface EventGridProps {
    events: any[];
    onRefresh: () => void;
}

const EventGrid: React.FC<EventGridProps> = ({ events }) => {

    const columns = [
        {
            title: 'Reference',
            dataIndex: 'polaris_ref',
            key: 'ref',
            render: (text: string) => (
                <a
                    href={`https://polaris.flightdataservices.com/event/${text}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1890ff', fontWeight: 500 }}
                >
                    {text}
                </a>
            )
        },
        {
            title: 'Event Short Desc',
            dataIndex: 'event_name',
            key: 'event',
            ellipsis: true,
        },
        {
            title: 'Date',
            dataIndex: 'flight_date',
            key: 'date',
        },
        {
            title: 'Delivery',
            key: 'delivery',
            render: (_: any, record: any) => (
                <Space>
                    <Tooltip title={`Email: ${record.email_status || 'PENDING'}`}>
                        <MailOutlined style={{ color: record.email_status === 'DRAFTED' ? '#52c41a' : '#4a4a4e' }} />
                    </Tooltip>
                    <Tooltip title={`WhatsApp: ${record.whatsapp_status || 'PENDING'}`}>
                        <WhatsAppOutlined style={{ color: record.whatsapp_status === 'SENT' ? '#52c41a' : '#4a4a4e' }} />
                    </Tooltip>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'analysis_status',
            key: 'status',
            render: (status: string) => {
                let color = 'default';
                if (status === 'NEW') color = 'cyan';
                if (status === 'EVIDENCE_READY') color = 'processing';
                if (status === 'DRAFTED') color = 'purple';
                if (status === 'NOTIFIED') color = 'success';
                return <Tag color={color}>{status}</Tag>;
            }
        },
    ];

    return (
        <Table
            dataSource={events}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 8 }}
            size="small"
            style={{ background: 'transparent' }}
            rowClassName={() => 'ant-table-row-hover'}
        />
    );
};

export default EventGrid;
