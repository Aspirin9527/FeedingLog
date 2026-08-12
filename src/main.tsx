import React from 'react';
import ReactDOM from 'react-dom/client';
import { CloudApp } from './CloudApp';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CloudApp />
  </React.StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app still works without offline caching.
    });
  });
}
