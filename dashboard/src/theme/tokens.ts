import { theme } from 'antd';

const darkTokens = {
    algorithm: theme.darkAlgorithm,
    token: {
        colorPrimary: '#00e5ff',
        borderRadius: 10,
        colorBgBase: '#0b0e13',
        colorBgContainer: 'rgba(20, 24, 32, 0.75)',
        colorBorder: 'rgba(0, 229, 255, 0.12)',
        colorTextBase: '#c8d6e5',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    components: {
        Table: {
            headerBg: 'rgba(15, 20, 30, 0.9)',
            headerColor: 'rgba(0, 229, 255, 0.7)',
            rowHoverBg: 'rgba(0, 229, 255, 0.06)',
            borderColor: 'rgba(0, 229, 255, 0.08)',
            colorBgContainer: 'transparent',
        },
        Card: {
            headerBg: 'transparent',
            colorBgContainer: 'transparent',
        },
        Menu: {
            darkItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(0, 229, 255, 0.12)',
            darkItemSelectedColor: '#00e5ff',
            darkItemColor: '#7a8ba0',
            darkItemHoverColor: '#c8d6e5',
            darkItemHoverBg: 'rgba(0, 229, 255, 0.06)',
        },
        Button: {
            colorPrimary: '#00e5ff',
            algorithm: true,
        },
        Tag: {
            colorBgContainer: 'transparent',
        },
    },
};

const lightTokens = {
    algorithm: theme.defaultAlgorithm,
    token: {
        colorPrimary: '#0077b6',
        borderRadius: 10,
        colorBgBase: '#f0f4f8',
        colorBgContainer: 'rgba(255, 255, 255, 0.7)',
        colorBorder: 'rgba(0, 119, 182, 0.12)',
        colorTextBase: '#1a2332',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    components: {
        Table: {
            headerBg: 'rgba(255, 255, 255, 0.85)',
            headerColor: '#4a6274',
            rowHoverBg: 'rgba(0, 119, 182, 0.06)',
            borderColor: 'rgba(0, 0, 0, 0.06)',
            colorBgContainer: 'transparent',
        },
        Card: {
            headerBg: 'transparent',
            colorBgContainer: 'transparent',
        },
        Menu: {
            itemBg: 'transparent',
            itemSelectedBg: 'rgba(0, 119, 182, 0.10)',
            itemSelectedColor: '#0077b6',
            itemColor: '#6b7280',
            itemHoverColor: '#1a2332',
            itemHoverBg: 'rgba(0, 119, 182, 0.06)',
        },
        Button: {
            colorPrimary: '#0077b6',
            algorithm: true,
        },
        Tag: {
            colorBgContainer: 'transparent',
        },
    },
};

export function getAntTheme(mode: 'dark' | 'light') {
    return mode === 'dark' ? darkTokens : lightTokens;
}
