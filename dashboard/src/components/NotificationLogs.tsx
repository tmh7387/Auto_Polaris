import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Statistic, Row, Col, Empty } from 'antd';
import { MailOutlined, WhatsAppOutlined, BellOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface NotificationRecord {
    id: number;
    event_id: number;
    channel: string;
    sent_at: string;
    status: string;
    polaris_ref: string;
    event_name: string;
    tail_number: string;
    flight_date: string;
}

const statusMap: Record<string, string> = {
    DRAFTED: 'status-tag--orange',
    SENT: 'status-tag--green',
    FAILED: 'status-tag--red',
};

const NotificationLogs: React.FC = () => {
    const [data, setData] = useState<NotificationRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://127.0.0.1:3001/api/notifications')
            .then(res => res.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const emailCount = data.filter(r => r.channel === 'EMAIL').length;
    const whatsappCount = data.filter(r => r.channel === 'WHATSAPP').length;
    const totalCount = data.length;

    const columns = [
        {
            title: 'Channel',
            dataIndex: 'channel',
            key: 'channel',
            width: 120,
            filters: [
                { text: 'Email', value: 'EMAIL' },
                { text: 'WhatsApp', value: 'WHATSAPP' },
            ],
            onFilter: (value: any, record: NotificationRecord) => record.channel === value,
            render: (ch: string) => (
                ch === 'EMAIL'
                    ? <span className="status-tag status-tag--cyan"><MailOutlined style={{ marginRight: 4 }} />EMAIL</span>
                    : <span className="status-tag status-tag--green"><WhatsAppOutlined style={{ marginRight: 4 }} />WHATSAPP</span>
            ),
        },
        {
            title: 'Reference',
            dataIndex: 'polaris_ref',
            key: 'polaris_ref',
            width: 120,
            render: (ref: string) => (
                <a
                    href={`https://polaris.flightdataservices.com/flight/${ref}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="mono-data"
                    style={{ color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                    {ref}
                </a>
            ),
        },
        {
            title: 'Event',
            dataIndex: 'event_name',
            key: 'event_name',
            ellipsis: true,
            render: (name: string) => (
                <Text style={{ color: 'var(--text-primary)', fontSize: 12 }}>{name || '-'}</Text>
            ),
        },
        {
            title: 'Aircraft',
            dataIndex: 'tail_number',
            key: 'tail_number',
            width: 100,
            render: (tail: string) => (
                <Text className="mono-data" style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{tail || '-'}</Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (status: string) => (
                <span className={`status-tag ${statusMap[status] || ''}`}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />{status}
                </span>
            ),
        },
        {
            title: 'Sent At',
            dataIndex: 'sent_at',
            key: 'sent_at',
            width: 180,
            render: (text: string) => (
                <Text className="mono-data" style={{ color: 'var(--text-secondary)' }}>
                    {text ? new Date(text + 'Z').toLocaleString() : '-'}
                </Text>
            ),
        },
    ];

    return (
        <div>
            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total Notifications</Text>}
                            value={totalCount}
                            prefix={<BellOutlined />}
                            valueStyle={{ color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Email Drafts</Text>}
                            value={emailCount}
                            prefix={<MailOutlined />}
                            valueStyle={{ color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>WhatsApp Sent</Text>}
                            value={whatsappCount}
                            prefix={<WhatsAppOutlined />}
                            valueStyle={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Table */}
            <Card title={<><BellOutlined style={{ marginRight: 8 }} />NOTIFICATION DELIVERY LOG</>}>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15, size: 'small' }}
                    size="small"
                    locale={{ emptyText: <Empty description={<Text style={{ color: 'var(--text-tertiary)' }}>No notifications sent yet</Text>} /> }}
                    style={{ background: 'transparent' }}
                />
            </Card>
        </div>
    );
};

export default NotificationLogs;
