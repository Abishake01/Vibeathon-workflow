import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

const Toast = ({ id, type = 'info', message, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const icons = {
    success: <FiCheckCircle />,
    error: <FiXCircle />,
    warning: <FiAlertTriangle />,
    info: <FiInfo />
  };

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  return (
    <div 
      className={`toast toast-${type} ${isExiting ? 'toast-exit' : ''}`}
      style={{ borderLeft: `4px solid ${colors[type]}` }}
    >
      <div className="toast-icon" style={{ color: colors[type] }}>
        {icons[type]}
      </div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
      </div>
      <button 
        className="toast-close"
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(id), 300);
        }}
      >
        <FiX />
      </button>

      <style>{`
        .toast {
          background: var(--surface);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 300px;
          max-width: 500px;
          animation: slideIn 0.3s ease-out;
          margin-bottom: 12px;
        }

        .toast-exit {
          animation: slideOut 0.3s ease-out;
        }

        .toast-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-message {
          font-size: 14px;
          color: var(--text);
          word-wrap: break-word;
        }

        .toast-close {
          background: none;
          border: none;
          color: var(--textSecondary);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .toast-close:hover {
          background: var(--hover);
          color: var(--text);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export const ToastContainer = ({ toasts, onClose }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }

        .toast-container > * {
          pointer-events: all;
        }
      `}</style>
    </div>
  );
};

export default Toast;

