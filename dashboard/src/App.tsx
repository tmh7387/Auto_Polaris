import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Card, Row, Col, Divider, theme } from 'antd';
import {
  RocketOutlined,
  DatabaseOutlined,
  NotificationOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import EventGrid from './components/EventGrid';
import TerminalLogs from './components/TerminalLogs';
import ControlPanel from './components/ControlPanel';

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;

const App: React.FC = () => {
  const { useToken } = theme;
  const { token } = useToken();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<{ type: string; content: string }[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const newSocket = io('http://127.0.0.1:3001');
    setSocket(newSocket);

    newSocket.on('log', (log: { type: string; content: string }) => {
      setLogs(prev => [...prev.slice(-100), log]);
    });

    fetchEvents();

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://127.0.0.1:3001/api/events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  // Note: token is available if needed for advanced styling
  console.log('Theme token:', token);

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0a0c' }}>
      <Sider
        width={260}
        style={{
          background: '#141418',
          borderRight: '1px solid #2d2d34'
        }}
      >
        <div style={{ height: 64, margin: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RocketOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 12 }} />
          <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700, letterSpacing: 1 }}>AUTO-POLARIS</Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          style={{ background: 'transparent' }}
          items={[
            { key: '1', icon: <DashboardOutlined />, label: 'Mission Control' },
            { key: '2', icon: <DatabaseOutlined />, label: 'Ingestion History' },
            { key: '3', icon: <NotificationOutlined />, label: 'Notification Logs' },
          ]}
        />
      </Sider>
      <Layout style={{ background: 'transparent' }}>
        <Header style={{ background: '#141418', padding: '0 24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #2d2d34' }}>
          <Title level={5} style={{ color: '#9ba1a6', margin: 0 }}>V2 LOCAL-FIRST / <Text strong style={{ color: '#fff' }}>MISSION CONTROL</Text></Title>
        </Header>
        <Content style={{ margin: '24px 16px', overflow: 'initial' }}>
          <Row gutter={[24, 24]}>
            <Col span={16}>
              <Card
                title={<><DatabaseOutlined /> RED ALERT EVENTS</>}
                style={{
                  background: '#141418',
                  border: '1px solid #2d2d34',
                  borderRadius: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                }}
                styles={{ header: { borderBottom: '1px solid #2d2d34', color: '#fff' } }}
              >
                <EventGrid events={events} onRefresh={fetchEvents} />
              </Card>
            </Col>
            <Col span={8}>
              <ControlPanel socket={socket} onRefresh={fetchEvents} />
              <Divider style={{ borderColor: '#2d2d34' }} />
              <TerminalLogs logs={logs} />
            </Col>
          </Row>
        </Content>
        <Footer style={{ textAlign: 'center', background: 'transparent', color: '#4a4a4e' }}>
          Auto-Polaris V2 ©2026 Crafted by Antigravity
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;
