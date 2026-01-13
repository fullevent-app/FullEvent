import React from 'react';
import ReactDOM from 'react-dom/client';
import { FulleventProvider } from '@fullevent/react';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <FulleventProvider config={{
            apiUrl: 'http://localhost:3005', // Your FullEvent API
            apiKey: import.meta.env.VITE_FULLEVENT_API_KEY || 'demo_key',
            service: 'checkout-frontend',
            environment: 'development',
            debug: true,
        }}>
            <App />
        </FulleventProvider>
    </React.StrictMode>
);
