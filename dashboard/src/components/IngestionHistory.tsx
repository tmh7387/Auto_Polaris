import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Statistic, Row, Col, Empty } from 'antd';
import { FileTextOutlined, CloudDownloadOutlined, CalendarOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ImportRecord {
    id: number;
    filename: string;
    imported_at: string;
    row_count: number;
}

const IngestionHistory: React.FC = () => {
    const [data, setData] = useState<ImportRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://127.0.0.1:3001/api/imports')
            .then(res => res.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const totalFiles = data.length;
    const totalEvents = data.reduce((sum, r) => sum + (r.row_count || 0), 0);
    const lastImport = data.length > 0 ? data[0].imported_at : 'N/A';

    const columns = [
        {
            title: 'File',
            dataIndex: 'filename',
            key: 'filename',
            render: (text: string) => (
                <Text className="mono-data" style={{ color: 'var(--text-primary)' }}>
                    <FileTextOutlined style={{ marginRight: 6, color: 'var(--accent-primary)' }} />
                    {text}
                </Text>
            ),
        },
        {
            title: 'Events',
            dataIndex: 'row_count',
            key: 'row_count',
            width: 90,
            align: 'center' as const,
            render: (val: number) => (
                <span className={`status-tag ${val > 0 ? 'status-tag--cyan' : ''}`}>{val}</span>
            ),
        },
        {
            title: 'Imported At',
            dataIndex: 'imported_at',
            key: 'imported_at',
            width: 200,
            render: (text: string) => (
                <Text className="mono-data" style={{ color: 'var(--text-secondary)' }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
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
                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total Files Ingested</Text>}
                            value={totalFiles}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: 'var(--accent-primary)', fontFamily: "'JetBrains Mono', monospace" }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Total Events Imported</Text>}
                            value={totalEvents}
                            prefix={<CloudDownloadOutlined />}
                            valueStyle={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Last Import</Text>}
                            value={lastImport !== 'N/A' ? new Date(lastImport + 'Z').toLocaleDateString() : 'N/A'}
                            prefix={<CalendarOutlined />}
                            valueStyle={{ color: 'var(--accent-orange)', fontSize: 20, fontFamily: "'JetBrains Mono', monospace" }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Table */}
            <Card title={<><FileTextOutlined style={{ marginRight: 8 }} />CSV IMPORT HISTORY</>}>
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15, size: 'small' }}
                    size="small"
                    locale={{ emptyText: <Empty description={<Text style={{ color: 'var(--text-tertiary)' }}>No imports yet</Text>} /> }}
                    style={{ background: 'transparent' }}
                />
            </Card>
        </div>
    );
};

export default IngestionHistory;
