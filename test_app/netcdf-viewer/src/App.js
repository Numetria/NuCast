import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ControlPanel from './components/ControlPanel';
import PlotCanvas from './components/PlotCanvas';
import './App.css';

function App() {
  const [info, setInfo] = useState(null);
  const [filename, setFilename] = useState(null);
  const [variable, setVariable] = useState(null);
  const [timeIdx, setTimeIdx] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeVar = info && variable
    ? info.variables.find((v) => v.name === variable)
    : null;

  const fetchVariable = async (varName, tIdx, lIdx) => {
    if (!filename || !varName) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/variable?filename=${encodeURIComponent(filename)}` +
        `&variable=${encodeURIComponent(varName)}` +
        `&time=${tIdx}&level=${lIdx}`
      );
      const json = await resp.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVariableChange = (name) => {
    setVariable(name);
    setTimeIdx(0);
    setLevelIdx(0);
    fetchVariable(name, 0, 0);
  };

  const handleTimeChange = (t) => {
    setTimeIdx(t);
    fetchVariable(variable, t, levelIdx);
  };

  const handleLevelChange = (l) => {
    setLevelIdx(l);
    fetchVariable(variable, timeIdx, l);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NetCDF Viewer</h1>
      </header>

      {!info && (
        <FileUpload
          onUploaded={(resp) => {
            setInfo(resp.info);
            setFilename(resp.filename);
            setError(null);
          }}
          onError={setError}
        />
      )}

      {info && (
        <div className="viewer">
          <ControlPanel
            info={info}
            variable={variable}
            timeIdx={timeIdx}
            levelIdx={levelIdx}
            onVariableChange={handleVariableChange}
            onTimeChange={handleTimeChange}
            onLevelChange={handleLevelChange}
            onReset={() => {
              setInfo(null);
              setFilename(null);
              setVariable(null);
              setData(null);
              setTimeIdx(0);
              setLevelIdx(0);
            }}
          />

          {error && <div className="error">Error: {error}</div>}
          {loading && <div className="loading">Loading...</div>}

          {!loading && !error && data && activeVar && (
            <PlotCanvas
              data={data}
              variable={activeVar}
              suggestedPlot={activeVar.suggested_plot}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
