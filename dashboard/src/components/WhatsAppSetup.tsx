import React, { useState, useEffect } from 'react';
import { MessageSquare, QrCode, CheckCircle, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const SANDBOX_NUMBER = '+14155238886';
const SANDBOX_JOIN_CODE = 'join sugar-fox';
const HANDSHAKE_KEY = 'whatsapp_sandbox_handshake_ts';
const EXPIRY_HOURS = 24;

const WhatsAppSetup: React.FC = () => {
    const [lastHandshake, setLastHandshake] = useState<number | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isExpired, setIsExpired] = useState(true);
    const [showQR, setShowQR] = useState(false);

    const waLink = `https://wa.me/${SANDBOX_NUMBER.replace('+', '')}?text=${encodeURIComponent(SANDBOX_JOIN_CODE)}`;

    useEffect(() => {
        const saved = localStorage.getItem(HANDSHAKE_KEY);
        if (saved) setLastHandshake(parseInt(saved, 10));
    }, []);

    useEffect(() => {
        if (!lastHandshake) {
            setIsExpired(true);
            setTimeRemaining('No handshake recorded');
            return;
        }

        const update = () => {
            const diff = lastHandshake + EXPIRY_HOURS * 3600000 - Date.now();
            if (diff <= 0) {
                setIsExpired(true);
                setTimeRemaining('Expired');
            } else {
                setIsExpired(false);
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                setTimeRemaining(`${h}h ${m}m remaining`);
            }
        };

        update();
        const interval = setInterval(update, 10000);
        return () => clearInterval(interval);
    }, [lastHandshake]);

    const markHandshakeComplete = () => {
        const now = Date.now();
        localStorage.setItem(HANDSHAKE_KEY, now.toString());
        setLastHandshake(now);
        setShowQR(false);
    };

    return (
        <div className="aero-panel">
            <div className="aero-panel-body">
                {/* Header */}
                <div className="sandbox-header">
                    <div className="sandbox-header-left">
                        <MessageSquare size={14} style={{ color: 'var(--accent-green)' }} />
                        <span className="aero-panel-label" style={{ fontSize: 10, letterSpacing: '0.2em' }}>
                            External Sandbox
                        </span>
                    </div>
                    <span className={`sandbox-status-badge ${isExpired ? 'sandbox-status-badge--expired' : 'sandbox-status-badge--active'}`}>
                        {isExpired ? 'Expired' : 'Active'}
                    </span>
                </div>

                {/* Handshake State */}
                <div className="sandbox-meta">
                    <span>Handshake State:</span>
                    <span style={{ color: isExpired ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        {isExpired ? 'Fail' : timeRemaining}
                    </span>
                </div>

                {/* QR Code Area */}
                {showQR ? (
                    <div style={{ textAlign: 'center' }}>
                        <div className="qr-section">
                            <div style={{
                                background: '#fff',
                                display: 'inline-block',
                                padding: 14,
                                borderRadius: 10,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            }}>
                                <QRCodeSVG value={waLink} size={140} level="M" includeMargin={false} />
                            </div>
                            <span style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                color: 'var(--text-muted)',
                            }}>
                                Scan → Send "{SANDBOX_JOIN_CODE}"
                            </span>
                            <span className="mono-data" style={{ color: 'var(--accent-primary)', fontSize: 11 }}>
                                {SANDBOX_JOIN_CODE}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                className="gradient-btn"
                                style={{ padding: '10px 16px', fontSize: 9 }}
                                onClick={markHandshakeComplete}
                            >
                                <CheckCircle size={14} />
                                I've Sent It
                            </button>
                            <button
                                className="secondary-btn"
                                style={{ padding: '10px 16px', fontSize: 9, width: 'auto' }}
                                onClick={() => setShowQR(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        className="secondary-btn"
                        onClick={() => setShowQR(true)}
                    >
                        <QrCode size={14} />
                        {isExpired ? 'Reconnect Sandbox' : 'Reset Handshake'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default WhatsAppSetup;
