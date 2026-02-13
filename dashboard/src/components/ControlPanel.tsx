import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { Socket } from 'socket.io-client';

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
        <div className="aero-panel">
            <div className="aero-panel-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
                    <Zap size={14} style={{ color: 'var(--accent-primary)' }} />
                    <span className="aero-panel-label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
                        Operation Control
                    </span>
                </div>

                <button
                    className="gradient-btn"
                    onClick={() => trigger('run-full-workflow', 'full')}
                    disabled={!!loading}
                >
                    <Zap size={16} fill="white" />
                    {loading === 'full' ? 'Running...' : 'Run Workflow'}
                </button>

                <div className="system-link">
                    <span style={{ color: 'var(--text-muted)' }}>System Link:</span>
                    <span style={{
                        color: socket ? 'var(--accent-green)' : 'var(--accent-red)',
                        animation: socket ? 'subtle-pulse 2s infinite ease-in-out' : 'none',
                    }}>
                        {socket ? 'Active' : 'Disconnected'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ControlPanel;
