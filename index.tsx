import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Dang ky Service Worker cho PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('SW registered');
    }).catch(err => {
      console.log('SW registration failed', err);
    });
  });
}

// Global Error Handler to catch white screen issues
window.onerror = function(message, source, lineno, colno, error) {
  const errorMsg = `Lỗi hệ thống: ${message}\nTại: ${source}:${lineno}:${colno}`;
  console.error(errorMsg);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; color: #991b1b; font-family: sans-serif; border-radius: 12px; margin: 20px; border: 2px solid #f87171;">
        <h2 style="margin-top: 0;">⚠️ Đã xảy ra lỗi</h2>
        <p>Ứng dụng không thể khởi động. Vui lòng thử tải lại trang.</p>
        <pre style="white-space: pre-wrap; font-size: 12px; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #fecaca;">${errorMsg}</pre>
        <button onclick="window.location.reload()" style="background: #991b1b; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Tải lại trang</button>
      </div>
    `;
  }
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('Unhandled rejection:', event.reason);
  // Optional: show alert or UI
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <App />
);
