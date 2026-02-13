
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Rocket, 
  LayoutDashboard, 
  History, 
  Bell, 
  Activity, 
  Zap, 
  MessageSquare, 
  Terminal, 
  Sun, 
  Moon, 
  AlertTriangle,
  QrCode,
  ArrowRight
} from 'lucide-react';

// Aviation background - High-tech helicopter/aircraft vibe
const AIRCRAFT_BG = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=2000";

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [logs, setLogs] = useState<string[]>(["Waiting for system events...", "System initialized v2.0.4", "Handshake protocol active"]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`].slice(-50));
  };

  const runWorkflow = () => {
    addLog("Initiating Workflow sequence...");
    setTimeout(() => addLog("Resource allocation confirmed."), 500);
    setTimeout(() => addLog("Execution thread started: PID-9923."), 1200);
    setTimeout(() => addLog("Data stream synchronized."), 2000);
  };

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // AeroCore Design Tokens
  const theme = {
    bg: isDarkMode ? "bg-slate-950" : "bg-slate-100",
    panel: isDarkMode 
      ? "bg-slate-900/40 border-slate-800/50 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]" 
      : "bg-white/40 border-white/60 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]",
    text: isDarkMode ? "text-slate-100" : "text-slate-900",
    muted: isDarkMode ? "text-slate-500" : "text-slate-500",
    accent: isDarkMode ? "text-cyan-400" : "text-blue-600",
    accentBg: isDarkMode ? "bg-cyan-500" : "bg-blue-600",
    green: isDarkMode ? "text-emerald-400" : "text-emerald-600",
    red: "text-rose-500",
    border: isDarkMode ? "border-white/5" : "border-slate-200/50",
  };

  return (
    <div className={`min-h-screen w-full flex overflow-hidden font-sans transition-colors duration-700 ${theme.bg} ${theme.text}`}>
      {/* Dynamic Tactical Background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000"
        style={{
          backgroundImage: `url('${AIRCRAFT_BG}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isDarkMode ? 0.12 : 0.35
        }}
      />
      
      {/* Column 1: Navigation Sidebar */}
      <aside className={`w-64 z-10 flex flex-col border-r backdrop-blur-2xl transition-all duration-500 ${isDarkMode ? 'bg-slate-950/80 border-slate-800/50 shadow-2xl' : 'bg-white/80 border-slate-200 shadow-xl'}`}>
        <div className="p-8 flex items-center gap-4">
          <div className={`p-2.5 rounded-xl ${theme.accentBg} shadow-lg shadow-cyan-500/20 flex items-center justify-center`}>
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-black tracking-[0.25em] uppercase leading-tight">Auto-Polaris</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Strategic Data Ingestion</p>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-8 space-y-2">
          <NavItem active icon={<LayoutDashboard size={18}/>} label="Mission Control" isDark={isDarkMode} />
          <NavItem icon={<History size={18}/>} label="Ingestion History" isDark={isDarkMode} />
          <NavItem icon={<Bell size={18}/>} label="Notification Logs" isDark={isDarkMode} />
        </nav>

        <div className="p-8 border-t border-white/5">
          <div className="p-4 rounded-xl bg-slate-500/5 border border-white/5 text-center">
             <p className="text-[9px] text-slate-500 font-mono tracking-widest leading-relaxed">SYSTEM CORE V2.0.4<br/>NODE READY</p>
          </div>
        </div>
      </aside>

      {/* Main Tactical Interface */}
      <main className="flex-1 z-10 flex flex-col min-w-0">
        {/* Top Breadcrumb & Controls */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4 text-[10px] font-mono tracking-[0.2em] font-bold">
            <span className={theme.accent}>V2 LOCAL-FIRST</span>
            <span className="text-slate-600">/</span>
            <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>MISSION CONTROL</span>
          </div>

          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest ${isDarkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'} border border-emerald-500/20 uppercase shadow-sm`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              System Online
            </div>
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-800/50 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Columns Grid */}
        <div className="flex-1 p-8 grid grid-cols-12 gap-8 overflow-hidden">
          
          {/* Column 2: Alert Events Table (8/12) */}
          <section className="col-span-8 flex flex-col min-w-0">
            <div className={`flex-1 rounded-2xl border flex flex-col overflow-hidden ${theme.panel}`}>
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50'} flex items-center justify-center`}>
                    <AlertTriangle className={theme.red} size={16} />
                  </div>
                  <h2 className="text-xs font-bold tracking-[0.25em] uppercase">Red Alert Events</h2>
                </div>
                <div className="flex items-center gap-4 text-[9px] font-mono uppercase font-bold tracking-widest opacity-60">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Live Feed
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>0 Active Events</span>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[11px] font-medium tracking-wide">
                  <thead className={`sticky top-0 z-10 uppercase tracking-[0.15em] font-bold ${isDarkMode ? 'bg-slate-900/80 backdrop-blur-md' : 'bg-slate-50/80 backdrop-blur-md'}`}>
                    <tr>
                      <th className="px-6 py-4 text-slate-500 border-b border-white/5">Reference</th>
                      <th className="px-6 py-4 text-slate-500 border-b border-white/5">Event Short Desc</th>
                      <th className="px-6 py-4 text-slate-500 border-b border-white/5">Date</th>
                      <th className="px-6 py-4 text-slate-500 border-b border-white/5">Delivery</th>
                      <th className="px-6 py-4 text-slate-500 border-b border-white/5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {alerts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-32 text-center opacity-20">
                          <div className="flex flex-col items-center gap-6">
                            <Activity size={56} strokeWidth={1} className="animate-pulse" />
                            <p className="font-mono uppercase tracking-[0.3em] text-[10px] font-bold">Scanning for anomalies...</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      alerts.map((alert, i) => (
                        <tr key={i} className={`transition-colors cursor-default ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-900/5'}`}>
                           <td className="px-6 py-4 font-mono">{alert.ref}</td>
                           <td className="px-6 py-4">{alert.desc}</td>
                           <td className="px-6 py-4 opacity-60">{alert.date}</td>
                           <td className="px-6 py-4">{alert.delivery}</td>
                           <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase text-[9px]">
                                {alert.status}
                              </span>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Column 3: Operation Controls & Logs (4/12) */}
          <aside className="col-span-4 flex flex-col gap-6 overflow-hidden">
            {/* Primary Action Card */}
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${theme.panel}`}>
              <div className="flex items-center gap-2 mb-8">
                <Zap size={14} className={theme.accent} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Operation Control</h3>
              </div>
              <button 
                onClick={runWorkflow}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 text-white font-black uppercase tracking-[0.25em] text-[11px] shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Zap size={16} fill="white" />
                Run Workflow
              </button>
              <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-mono uppercase font-bold tracking-widest opacity-60">
                <span className="text-slate-500">System Link:</span>
                <span className={`${theme.green} animate-pulse`}>Active</span>
              </div>
            </div>

            {/* Integration Status Card */}
            <div className={`p-6 rounded-2xl border ${theme.panel}`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className={theme.green} />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">External Sandbox</h3>
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase font-mono tracking-tighter">
                  Expired
                </span>
              </div>
              <div className="flex items-center justify-between mb-8 text-[9px] font-mono font-bold opacity-60 uppercase tracking-widest">
                <span>Handshake State:</span>
                <span className={theme.red}>Fail</span>
              </div>
              <button className={`w-full py-3.5 rounded-xl ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-900 text-white hover:bg-slate-800'} font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3 border border-white/5`}>
                <QrCode size={14} />
                Reconnect Sandbox
              </button>
            </div>

            {/* Execution Console Terminal */}
            <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col ${theme.panel}`}>
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-slate-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Execution Logs</h3>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="flex-1 p-5 font-mono text-[10px] overflow-auto space-y-2.5 leading-tight custom-scrollbar">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-4 group">
                    <span className="text-slate-700 select-none font-bold tabular-nums w-4 text-right opacity-30 group-hover:opacity-100 transition-opacity">{i+1}</span>
                    <span className={`${log.includes('[') ? theme.accent : isDarkMode ? 'text-slate-400' : 'text-slate-600'} break-all font-bold tracking-tight`}>
                      {log}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
};

// UI Components
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  isDark: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, isDark }) => {
  const activeStyles = isDark 
    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20" 
    : "bg-blue-600 text-white shadow-lg shadow-blue-600/30";
  
  const inactiveStyles = isDark
    ? "text-slate-500 hover:text-slate-200 hover:bg-white/5"
    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/80";

  return (
    <button className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-[11px] font-black tracking-[0.1em] uppercase transition-all group ${active ? activeStyles : inactiveStyles}`}>
      <span className={`${active ? 'opacity-100' : 'opacity-40 group-hover:opacity-100 transition-opacity'}`}>
        {icon}
      </span>
      {label}
      {active && <ArrowRight className="ml-auto opacity-40 animate-pulse" size={12} />}
    </button>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
