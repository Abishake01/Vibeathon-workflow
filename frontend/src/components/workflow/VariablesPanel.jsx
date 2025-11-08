import React, { useState } from "react";

const VariablesPanel = ({ onVariableSelect }) => {
  const [outputView, setOutputView] = useState("schema");
  const [isExpanded, setIsExpanded] = useState(true);

  const jsonData = {
    $now: "2025-11-08T11:51:24.574+05:30",
    $today: "2025-11-08T00:00:00.000+05:30",
    $vars: {
      $execution: {
        id: "[filled at execution time]",
        mode: "test",
        resumeUrl: "The URL for resuming a 'Wait' node",
      },
      $workflow: {
        id: "pMq9FG26HN1m7pWb",
        name: "AI Agent workflow",
        active: false,
      },
    },
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    alert("✅ JSON copied to clipboard!");
  };

  return (
    <div className="variables-panel-container">
      <button
        className="collapsible-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "▼" : "▶"} Variables and context
      </button>
      {isExpanded && (
        <div className="collapsible-content">
          {/* Tabs */}
          <div className="view-tabs">
            <button
              className={`view-tab ${outputView === "schema" ? "active" : ""}`}
              onClick={() => setOutputView("schema")}
            >
              Schema
            </button>
            <button
              className={`view-tab ${outputView === "table" ? "active" : ""}`}
              onClick={() => setOutputView("table")}
            >
              Table
            </button>
            <button
              className={`view-tab ${outputView === "json" ? "active" : ""}`}
              onClick={() => setOutputView("json")}
            >
              JSON
            </button>
          </div>

          {/* Schema View */}
          {outputView === "schema" && (
            <div className="variables-box scrollable">
              <div 
                className="variable-item draggable"
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('text/plain', '$now')}
                onClick={() => onVariableSelect && onVariableSelect('$now')}
                title="Click or drag to expression editor"
              >
                <span className="var-icon">T</span>
                <span className="var-name">$now</span>
                <span className="var-value">{jsonData.$now}</span>
              </div>
              <div 
                className="variable-item draggable"
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('text/plain', '$today')}
                onClick={() => onVariableSelect && onVariableSelect('$today')}
                title="Click or drag to expression editor"
              >
                <span className="var-icon">T</span>
                <span className="var-name">$today</span>
                <span className="var-value">{jsonData.$today}</span>
              </div>
              <div className="variable-group">
                <div className="group-header">
                  <span className="arrow-icon">▼</span>
                  <span className="cube-icon">⧉</span>
                  <span className="var-name">$vars</span>
                </div>
                <div className="group-content">
                  <div className="nested-group">
                    <div className="group-header">
                      <span className="arrow-icon">▼</span>
                      <span className="cube-icon">⧉</span>
                      <span className="var-name">$execution</span>
                    </div>
                    <div className="group-content">
                      {Object.entries(jsonData.$vars.$execution).map(([k, v]) => (
                        <div 
                          className="variable-item draggable"
                          key={k}
                          draggable="true"
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', `$vars.$execution.${k}`)}
                          onClick={() => onVariableSelect && onVariableSelect(`$vars.$execution.${k}`)}
                          title="Click or drag to expression editor"
                        >
                          <span className="var-icon">T</span>
                          <span className="var-name">{k}</span>
                          <span className="var-value">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="nested-group">
                    <div className="group-header">
                      <span className="arrow-icon">▼</span>
                      <span className="cube-icon">⧉</span>
                      <span className="var-name">$workflow</span>
                    </div>
                    <div className="group-content">
                      {Object.entries(jsonData.$vars.$workflow).map(([k, v]) => (
                        <div 
                          className="variable-item draggable"
                          key={k}
                          draggable="true"
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', `$vars.$workflow.${k}`)}
                          onClick={() => onVariableSelect && onVariableSelect(`$vars.$workflow.${k}`)}
                          title="Click or drag to expression editor"
                        >
                          <span className="var-icon">
                            {typeof v === "boolean" ? "□" : "T"}
                          </span>
                          <span className="var-name">{k}</span>
                          <span
                            className={`var-value ${
                              typeof v === "boolean" ? "boolean" : ""
                            }`}
                          >
                            {v.toString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table View */}
          {outputView === "table" && (
            <div className="table-view scrollable">
              <table>
                <thead>
                  <tr>
                    <th>Variable</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>$now</td>
                    <td>{jsonData.$now}</td>
                  </tr>
                  <tr>
                    <td>$today</td>
                    <td>{jsonData.$today}</td>
                  </tr>
                  {Object.entries(jsonData.$vars.$execution).map(([k, v]) => (
                    <tr key={`exec-${k}`}>
                      <td>$execution.{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                  {Object.entries(jsonData.$vars.$workflow).map(([k, v]) => (
                    <tr key={`wf-${k}`}>
                      <td>$workflow.{k}</td>
                      <td>{v.toString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* JSON View */}
          {outputView === "json" && (
            <div className="json-view scrollable">
              <div className="json-header">
                <button className="copy-btn" onClick={handleCopyJSON}>
                  📋 Copy JSON
                </button>
              </div>
              <pre className="json-content">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <style>{`
        .variables-panel-container {
          background-color: #1f1f1f;
          color: #fff;
          font-family: "Inter", sans-serif;
          padding: 10px;
          width: 270px;
          border-radius: 6px;
          font-size: 13px;
          overflow: hidden;
        }
        .scrollable {
          max-height: 340px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .collapsible-header {
          background: none;
          border: none;
          color: #fff;
          font-weight: 500;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          margin-bottom: 8px;
        }
        .view-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
        }
        .view-tab {
          background: #2a2a2a;
          border: 1px solid #3c3c3c;
          color: #aaa;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: 0.2s;
        }
        .view-tab.active {
          background: #ff6d5a;
          color: #fff;
        }
        .variables-box {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px;
          overflow-wrap: break-word;
          word-break: break-word;
        }
        .variable-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .variable-item.draggable {
          cursor: grab;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .variable-item.draggable:hover {
          background: rgba(255, 109, 90, 0.1);
        }
        .variable-item.draggable:active {
          cursor: grabbing;
        }
        .var-icon {
          color: #aaa;
        }
        .var-name {
          min-width: 90px;
          color: #fff;
          word-break: break-word;
        }
        .var-value {
          color: #ccc;
          font-family: monospace;
          word-break: break-word;
          flex: 1;
        }
        .boolean {
          color: #ff6d5a;
        }
        .variable-group,
        .nested-group {
          margin-left: 16px;
          margin-top: 6px;
        }
        .group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          color: #fff;
        }
        .arrow-icon,
        .cube-icon {
          color: #888;
        }
        .table-view {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 8px;
          overflow-x: auto;
        }
        .table-view table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .table-view th,
        .table-view td {
          border: 1px solid #333;
          padding: 6px 8px;
          color: #ddd;
          text-align: left;
          word-break: break-word;
        }
        .table-view th {
          background-color: #2d2d2d;
          font-weight: 600;
        }
        .json-view {
          background: #252525;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 8px;
          overflow-x: auto;
        }
        .json-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 6px;
        }
        .copy-btn {
          background: #ff6d5a;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .copy-btn:hover {
          background: #ff563f;
        }
        .json-content {
          font-family: monospace;
          font-size: 12px;
          color: #ccc;
          background: #1b1b1b;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};

export default VariablesPanel;

