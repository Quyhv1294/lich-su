import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import '@fontsource/fraunces/vietnamese-400.css';
import '@fontsource/fraunces/vietnamese-600.css';
import '@fontsource/fraunces/vietnamese-700.css';
import '@fontsource/fraunces/vietnamese-900.css';
import '@fontsource/fraunces/vietnamese-400-italic.css';
import '@fontsource/fraunces/latin-ext-400.css';
import '@fontsource/fraunces/latin-ext-600.css';
import '@fontsource/fraunces/latin-ext-700.css';
import '@fontsource/fraunces/latin-ext-900.css';
import '@fontsource/fraunces/latin-ext-400-italic.css';
import '@fontsource/fraunces/latin-400.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-700.css';
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/latin-ext-400.css';
import '@fontsource/be-vietnam-pro/latin-ext-600.css';
import '@fontsource/be-vietnam-pro/latin-ext-700.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
