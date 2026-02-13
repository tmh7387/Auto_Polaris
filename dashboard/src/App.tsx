import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Card, Row, Col } from 'antd';
import {
  RocketOutlined,
  DatabaseOutlined,
  NotificationOutlined,
  DashboardOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { io, Socket } from 'socket.io-client';
import { useTheme } from './theme/ThemeContext';
import EventGrid from './components/EventGrid';
import TerminalLogs from './components/TerminalLogs';
import ControlPanel from './components/ControlPanel';
import WhatsAppSetup from './components/WhatsAppSetup';
import IngestionHistory from './components/IngestionHistory';
import NotificationLogs from './components/NotificationLogs';

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;

const PAGE_TITLES: Record<string, string> = {
  '1': 'MISSION CONTROL',
  '2': 'INGESTION HISTORY',
  '3': 'NOTIFICATION LOGS',
};

const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [logs, setLogs] = useState<{ type: string; content: string }[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [activePage, setActivePage] = useState('1');

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

  const renderContent = () => {
    switch (activePage) {
      case '2':
        return <IngestionHistory />;
      case '3':
        return <NotificationLogs />;
      default:
        return (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={17}>
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <span style={{ color: 'var(--accent-red)', marginRight: 8 }}>▲</span>
                      RED ALERT EVENTS
                    </span>
                    <Text style={{ color: 'var(--text-tertiary)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px' }}>
                      LIVE FEED • {events.length} ACTIVE
                    </Text>
                  </div>
                }
              >
                <EventGrid events={events} onRefresh={fetchEvents} />
              </Card>
            </Col>
            <Col xs={24} lg={7}>
              <ControlPanel socket={socket} onRefresh={fetchEvents} />
              <div style={{ height: 16 }} />
              <WhatsAppSetup />
              <TerminalLogs logs={logs} />
            </Col>
          </Row>
        );
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* ─── Sidebar ─── */}
      <Sider
        width={220}
        className="glass-sidebar"
        style={{ background: 'transparent', overflow: 'hidden' }}
      >
        {/* Logo */}
        <div style={{
          padding: '24px 20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <RocketOutlined className="logo-icon" style={{ fontSize: 22, color: 'var(--accent-primary)' }} />
          <div>
            <Title level={5} style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 800, letterSpacing: 1.5, fontSize: 15 }}>
              AUTO-POLARIS
            </Title>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 500 }}>
              Strategic Data Ingestion
            </Text>
          </div>
        </div>

        {/* Nav Menu */}
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[activePage]}
          onClick={({ key }) => setActivePage(key)}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }}
          items={[
            { key: '1', icon: <DashboardOutlined />, label: 'Mission Control' },
            { key: '2', icon: <DatabaseOutlined />, label: 'Ingestion History' },
            { key: '3', icon: <NotificationOutlined />, label: 'Notification Logs' },
          ]}
        />

      </Sider>

      {/* ─── Main Area ─── */}
      <Layout style={{ background: 'transparent' }}>
        {/* Header */}
        <Header
          className="glass-header"
          style={{
            background: 'transparent',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
            lineHeight: '52px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: 'var(--accent-primary)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, letterSpacing: 0.5 }}>
              V2 LOCAL-FIRST
            </Text>
            <Text style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>/</Text>
            <Text strong style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
              {PAGE_TITLES[activePage]}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* System Status Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span className={`pulse-dot ${socket ? 'pulse-dot--green' : 'pulse-dot--red'}`} />
              <Text style={{ color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: 0.5, fontSize: 11 }}>
                {socket ? 'SYSTEM ONLINE' : 'OFFLINE'}
              </Text>
            </div>

            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
              {isDark ? <SunOutlined /> : <MoonOutlined />}
            </button>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ margin: '20px 20px 0' }}>
          {renderContent()}
        </Content>

        <Footer style={{ textAlign: 'center', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 }}>
          Auto-Polaris V2 ©2026 Crafted by Antigravity
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;
