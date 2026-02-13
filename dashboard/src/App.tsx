import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Rocket,
  LayoutDashboard,
  History,
  Bell,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from './theme/ThemeContext';
import EventGrid from './components/EventGrid';
import TerminalLogs from './components/TerminalLogs';
import ControlPanel from './components/ControlPanel';
import WhatsAppSetup from './components/WhatsAppSetup';
import IngestionHistory from './components/IngestionHistory';
import NotificationLogs from './components/NotificationLogs';

const PAGE_TITLES: Record<string, string> = {
  '1': 'MISSION CONTROL',
  '2': 'INGESTION HISTORY',
  '3': 'NOTIFICATION LOGS',
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    className={`nav-item ${active ? 'nav-item--active' : ''}`}
    onClick={onClick}
  >
    <span className="nav-icon">{icon}</span>
    {label}
    {active && <ArrowRight className="nav-arrow" size={12} />}
  </button>
);

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
        return (
          <div style={{ padding: 32, flex: 1, overflow: 'auto' }}>
            <IngestionHistory />
          </div>
        );
      case '3':
        return (
          <div style={{ padding: 32, flex: 1, overflow: 'auto' }}>
            <NotificationLogs />
          </div>
        );
      default:
        return (
          <div className="content-grid">
            {/* Column 2: Alert Events Table (8/12) */}
            <section className="content-main">
              <div className="aero-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="aero-panel-header">
                  <div className="aero-panel-header-title">
                    <div
                      className="aero-panel-icon"
                      style={{ background: isDark ? 'rgba(244,63,94,0.10)' : 'rgba(244,63,94,0.08)' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-red)' }}>
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    </div>
                    <span className="aero-panel-label">Red Alert Events</span>
                  </div>
                  <div className="aero-panel-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block' }} />
                      Live Feed
                    </span>
                    <span style={{ color: 'var(--text-dim)' }}>|</span>
                    <span>{events.length} Active Events</span>
                  </div>
                </div>
                <EventGrid events={events} onRefresh={fetchEvents} />
              </div>
            </section>

            {/* Column 3: Operation Controls & Logs (4/12) */}
            <aside className="content-aside">
              <ControlPanel socket={socket} onRefresh={fetchEvents} />
              <WhatsAppSetup />
              <TerminalLogs logs={logs} />
            </aside>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Aircraft Background */}
      <div className="aircraft-bg" />

      {/* Column 1: Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Rocket />
          </div>
          <div>
            <div className="sidebar-title">Auto-Polaris</div>
            <div className="sidebar-subtitle">Strategic Data Ingestion</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavItem
            active={activePage === '1'}
            icon={<LayoutDashboard size={18} />}
            label="Mission Control"
            onClick={() => setActivePage('1')}
          />
          <NavItem
            active={activePage === '2'}
            icon={<History size={18} />}
            label="Ingestion History"
            onClick={() => setActivePage('2')}
          />
          <NavItem
            active={activePage === '3'}
            icon={<Bell size={18} />}
            label="Notification Logs"
            onClick={() => setActivePage('3')}
          />
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-version">
            SYSTEM CORE V2.0.4<br />NODE READY
          </div>
        </div>
      </aside>

      {/* Main Tactical Interface */}
      <main className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div className="breadcrumb">
            <span className="breadcrumb-accent">V2 LOCAL-FIRST</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-page">{PAGE_TITLES[activePage]}</span>
          </div>

          <div className="header-controls">
            <div className="status-pill">
              <div className="status-pill-dot" />
              {socket ? 'System Online' : 'Offline'}
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content */}
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
