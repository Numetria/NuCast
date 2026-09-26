import React from 'react';

function ControlPanel({
  info,
  variable,
  timeIdx,
  levelIdx,
  onVariableChange,
  onTimeChange,
  onLevelChange,
  onReset,
}) {
  const allVars = info.variables;

  return (
    <div className="control-panel">
      <div className="control-row">
        <label>Variable:</label>
        <select
          value={variable || ''}
          onChange={(e) => onVariableChange(e.target.value)}
        >
          <option value="" disabled>Select a variable</option>
          {allVars.map((v) => (
            <option key={v.name} value={v.name}>
              {v.label || v.name}
              {v.units ? ` (${v.units})` : ''}
              {v.suggested_plot ? ` — ${v.suggested_plot}` : ''}
            </option>
          ))}
        </select>
      </div>

      {info.time_size > 1 && (
        <div className="control-row">
          <label>Time step: {timeIdx} / {info.time_size - 1}</label>
          <input
            type="range"
            min="0"
            max={info.time_size - 1}
            value={timeIdx}
            onChange={(e) => onTimeChange(parseInt(e.target.value, 10))}
          />
        </div>
      )}

      {info.vertical_axes.length > 0 && (
        <div className="control-row">
          <label>Level ({info.vertical_axes[0]}):</label>
          <select
            value={levelIdx}
            onChange={(e) => onLevelChange(parseInt(e.target.value, 10))}
          >
            {Array.from(
              { length: info.vertical_sizes[info.vertical_axes[0]] || 1 },
              (_, i) => (
                <option key={i} value={i}>
                  Level {i}
                </option>
              )
            )}
          </select>
        </div>
      )}

      <div className="control-row">
        <button onClick={onReset}>Upload another file</button>
      </div>
    </div>
  );
}

export default ControlPanel;
