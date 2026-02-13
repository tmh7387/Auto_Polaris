import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import App from './App'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import { getAntTheme } from './theme/tokens'
import './index.css'

const ThemedApp: React.FC = () => {
  const { mode } = useTheme();
  const themeConfig = getAntTheme(mode);

  return (
    <ConfigProvider theme={themeConfig}>
      <App />
    </ConfigProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
)
