import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.tsx';
import { AdminAuthProvider } from './lib/auth-context.tsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <App />
        <SpeedInsights />
      </AdminAuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

