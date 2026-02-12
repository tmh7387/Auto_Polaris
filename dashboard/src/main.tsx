import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
          colorBgBase: '#0a0a0c',
          colorBgContainer: '#141418',
          colorBorder: '#2d2d34',
          colorTextBase: '#d1d1d1',
        },
        components: {
          Table: {
            headerBg: '#1e1e24',
            headerColor: '#9ba1a6',
            rowHoverBg: '#1e1e24',
          },
          Card: {
            headerBg: '#141418',
          }
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
