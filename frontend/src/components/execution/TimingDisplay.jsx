import React from 'react';
import { FiClock } from 'react-icons/fi';

const TimingDisplay = ({ startTime, endTime, duration, label = "Duration" }) => {
  const formatDuration = (start, end, dur) => {
    if (dur !== undefined && dur !== null) {
      // Use provided duration
      const durationMs = dur < 100 ? dur * 1000 : dur;
      if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
      if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
      return `${Math.round(durationMs / 1000)}s`;
    }
    
    if (!start) return '0ms';
    
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end ? (end instanceof Date ? end : new Date(end)) : new Date();
    
    const durationMs = endDate.getTime() - startDate.getTime();
    
    if (durationMs < 0) return '0ms';
    if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.round(durationMs / 1000)}s`;
  };

  const formattedDuration = formatDuration(startTime, endTime, duration);

  return (
    <div className="timing-display">
      <FiClock className="timing-icon" />
      <span className="timing-label">{label}:</span>
      <span className="timing-value">{formattedDuration}</span>
    </div>
  );
};

export default TimingDisplay;
