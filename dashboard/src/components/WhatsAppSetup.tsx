import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Tooltip, message } from 'antd';
import { WhatsAppOutlined, QrcodeOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';

const { Text } = Typography;

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
        message.success('Sandbox handshake recorded! Timer reset to 24 hours.');
    };

    return (
        <Card
            size="small"
            title={
                <span>
                    <WhatsAppOutlined style={{ color: 'var(--accent-green)', marginRight: 8 }} />
                    WhatsApp Sandbox
                </span>
            }
            extra={
                <span className={`status-tag ${isExpired ? 'status-tag--red' : 'status-tag--green'}`}>
                    {isExpired ? (
                        <><ClockCircleOutlined style={{ marginRight: 4 }} />EXPIRED</>
                    ) : (
                        <><CheckCircleOutlined style={{ marginRight: 4 }} />ACTIVE</>
                    )}
                </span>
            }
            style={{ marginBottom: 16 }}
        >
            {/* Status Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    {lastHandshake ? `Last: ${new Date(lastHandshake).toLocaleString()}` : 'Never connected'}
                </Text>
                <Text className="mono-data" style={{
                    color: isExpired ? 'var(--accent-red)' : 'var(--accent-green)',
                    fontSize: 11,
                    fontWeight: 600,
                }}>
                    {timeRemaining}
                </Text>
            </div>

            {/* QR Code Area */}
            {showQR ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <div style={{
                        background: '#fff',
                        display: 'inline-block',
                        padding: 14,
                        borderRadius: 10,
                        marginBottom: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    }}>
                        <QRCodeSVG value={waLink} size={160} level="M" includeMargin={false} />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                        <Text style={{ color: 'var(--text-secondary)', fontSize: 10, display: 'block' }}>
                            Scan with camera, then tap Send in WhatsApp
                        </Text>
                        <Text className="mono-data" style={{ color: 'var(--accent-primary)', marginTop: 4, display: 'block' }}>
                            {SANDBOX_JOIN_CODE}
                        </Text>
                    </div>
                    <Space>
                        <Button
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={markHandshakeComplete}
                            style={{ background: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                        >
                            I've Sent It
                        </Button>
                        <Button onClick={() => setShowQR(false)} style={{ color: 'var(--text-secondary)' }}>
                            Cancel
                        </Button>
                    </Space>
                </div>
            ) : (
                <Tooltip title={isExpired ? 'Sandbox expired — scan to reconnect' : 'Reset the 24hr timer'}>
                    <Button
                        block
                        icon={<QrcodeOutlined />}
                        onClick={() => setShowQR(true)}
                        style={{
                            background: isExpired ? 'var(--accent-green)' : 'transparent',
                            borderColor: isExpired ? 'var(--accent-green)' : 'var(--glass-border)',
                            color: isExpired ? '#fff' : 'var(--text-secondary)',
                            fontWeight: isExpired ? 600 : 400,
                            letterSpacing: 0.5,
                        }}
                    >
                        {isExpired ? 'Reconnect Sandbox' : 'Reset Handshake'}
                    </Button>
                </Tooltip>
            )}
        </Card>
    );
};

export default WhatsAppSetup;
