import React, { useState, useEffect, useRef, useMemo } from 'react';
import GraphVisualizer from './GraphVisualizer';
import { stconAlgorithm, standardBFSAlgorithm, stconCodeString, bfsCodeString } from './algorithm';
import { Play, Pause, StepForward, RotateCcw, Info, Settings, Database, Activity, Code, List, Edit3, Trash2 } from 'lucide-react';
import './index.css';

const INITIAL_GRAPHS = {
  custom: { name: 'Custom Graph (Build Mode)', target: 0, data: { nodes: [{id:0}], edges: [{source:0, target:0}] } },
  chain: {
    name: 'Long Chain (0 -> 4)', target: 4,
    data: {
      nodes: [0, 1, 2, 3, 4].map(id => ({ id })),
      edges: [
        { source: 0, target: 1 }, { source: 1, target: 2 },
        { source: 2, target: 3 }, { source: 3, target: 4 },
        ...[0,1,2,3,4].map(id => ({ source: id, target: id }))
      ]
    }
  },
  cycle: {
    name: 'Complex Cycle (0 -> 5)', target: 5,
    data: {
      nodes: [0, 1, 2, 3, 4, 5].map(id => ({ id })),
      edges: [
        { source: 0, target: 1 }, { source: 1, target: 2 },
        { source: 2, target: 0 }, { source: 2, target: 3 },
        { source: 3, target: 4 }, { source: 4, target: 5 },
        ...[0,1,2,3,4,5].map(id => ({ source: id, target: id }))
      ]
    }
  },
  disconnected: {
    name: 'Disconnected (0 -> 4)', target: 4,
    data: {
      nodes: [0, 1, 2, 3, 4].map(id => ({ id })),
      edges: [
        { source: 0, target: 1 }, { source: 1, target: 2 },
        { source: 3, target: 4 },
        ...[0,1,2,3,4].map(id => ({ source: id, target: id }))
      ]
    }
  },
  dense: {
    name: 'Dense Graph (0 -> 7)', target: 7,
    data: {
      nodes: [0, 1, 2, 3, 4, 5, 6, 7].map(id => ({ id })),
      edges: [
        { source: 0, target: 1 }, { source: 0, target: 2 }, { source: 0, target: 3 },
        { source: 1, target: 4 }, { source: 2, target: 5 }, { source: 3, target: 6 },
        { source: 4, target: 7 }, { source: 5, target: 7 }, { source: 6, target: 7 },
        { source: 1, target: 5 }, { source: 2, target: 6 }, { source: 4, target: 6 },
        ...[0,1,2,3,4,5,6,7].map(id => ({ source: id, target: id }))
      ]
    }
  }
};

function App() {
  const [graphs, setGraphs] = useState(INITIAL_GRAPHS);
  const [selectedGraphKey, setSelectedGraphKey] = useState('cycle');
  const activeGraph = graphs[selectedGraphKey];

  const [algorithmType, setAlgorithmType] = useState('stcon'); 

  const [activeNodes, setActiveNodes] = useState([0]);
  const [logs, setLogs] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState(null);
  
  const [isBuildMode, setIsBuildMode] = useState(false);
  const [customTarget, setCustomTarget] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  const algoGenRef = useRef(null);
  const playIntervalRef = useRef(null);

  window.activeAlgorithmType = algorithmType;

  const mathParams = useMemo(() => {
    const n = activeGraph.data.nodes.length;
    const log_n = Math.max(1, Math.log2(n));
    const sqrt_log_n = Math.sqrt(log_n);
    const r = Math.max(1, Math.ceil(sqrt_log_n));
    const k = Math.max(1, Math.ceil(Math.pow(2, sqrt_log_n)));
    const L = 2;
    const lambd = Math.pow(L, r);
    const memoryLimit = Math.ceil(n / lambd) + 2; 
    
    return { n, log_n: log_n.toFixed(2), r, k, L, lambd, memoryLimit };
  }, [activeGraph]);

  useEffect(() => {
    resetAlgorithm();
    if (selectedGraphKey === 'custom') {
      setIsBuildMode(true);
    } else {
      setIsBuildMode(false);
    }
  }, [selectedGraphKey, algorithmType]);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => stepAlgorithm(), speed);
    } else {
      clearInterval(playIntervalRef.current);
    }
    return () => clearInterval(playIntervalRef.current);
  }, [isPlaying, speed, isFinished]);

  const resetAlgorithm = () => {
    setIsPlaying(false);
    const target = selectedGraphKey === 'custom' ? customTarget : activeGraph.target;
    
    if (algorithmType === 'stcon') {
      algoGenRef.current = stconAlgorithm(activeGraph.data, 0, target);
    } else {
      algoGenRef.current = standardBFSAlgorithm(activeGraph.data, 0, target);
    }

    setActiveNodes([0]);
    setLogs([`${algorithmType.toUpperCase()} initialized on ${activeGraph.name}. s=0, t=${target}.`]);
    setIsFinished(false);
    setResult(null);
  };

  const stepAlgorithm = () => {
    if (isFinished || !algoGenRef.current || isBuildMode) {
      setIsPlaying(false);
      return;
    }
    
    const { value, done } = algoGenRef.current.next();
    
    if (done || (value && value.type === 'done')) {
      setIsFinished(true);
      setIsPlaying(false);
      setResult(value ? value.result : false);
      setLogs(prev => {
        const newLogs = [...prev, `ALGORITHM COMPLETE: Path ${value && value.result ? 'FOUND' : 'NOT FOUND'}!`];
        if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
        return newLogs;
      });
      if (value && value.S) setActiveNodes(value.S);
      return;
    }

    if (value) {
      if (value.description) {
        setLogs(prev => {
          const newLogs = [...prev, value.description];
          if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
          return newLogs;
        });
      }
      if (value.S) {
        setActiveNodes(value.S);
      }
    }
  };

  const handleGraphUpdate = (newData) => {
    setGraphs(prev => ({
      ...prev,
      custom: { ...prev.custom, data: newData }
    }));
  };

  const memoryPercentage = Math.min(100, (activeNodes.length / mathParams.n) * 100) || 0;
  const theoreticalLimitPercent = Math.min(100, (mathParams.memoryLimit / mathParams.n) * 100) || 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <h1>STCON Visualizer</h1>
          <p className="subtitle">Ultimate Edition: Build, Compare, and Debug</p>
        </div>
        
        <div className="header-controls">
          <div className="graph-selector">
            <label>Select Graph Topology:</label>
            <select value={selectedGraphKey} onChange={(e) => setSelectedGraphKey(e.target.value)}>
              {Object.keys(graphs).map(k => (
                <option key={k} value={k}>{graphs[k].name}</option>
              ))}
            </select>
          </div>
          <div className="graph-selector">
            <label>Select Algorithm:</label>
            <select value={algorithmType} onChange={(e) => setAlgorithmType(e.target.value)}>
              <option value="stcon">Sublinear STCON</option>
              <option value="bfs">Standard BFS</option>
            </select>
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <div className="glass-panel graph-panel">
            {isBuildMode && (
              <div className="build-toolbar">
                <span className="build-badge"><Edit3 size={14} /> BUILD MODE ACTIVE</span>
                <p>Tap empty space to add node. Tap Node A then Node B to link.</p>
                <div className="target-select">
                  <label>Target Node:</label>
                  <input type="number" min="0" value={customTarget} onChange={e => setCustomTarget(parseInt(e.target.value)||0)} />
                </div>
                <button className="btn secondary small" onClick={() => handleGraphUpdate({nodes:[], edges:[]})}><Trash2 size={14}/> Clear</button>
              </div>
            )}
            <GraphVisualizer graph={activeGraph.data} activeNodes={activeNodes} isBuildMode={isBuildMode} onGraphUpdate={handleGraphUpdate} />
          </div>

          <div className="glass-panel memory-panel">
            <div className="panel-header">
              <h3><Database size={18} /> Live Memory Tracking ({algorithmType.toUpperCase()})</h3>
              <span>{activeNodes.length} / {mathParams.n} Nodes Stored</span>
            </div>
            <div className="progress-bar-container">
              <div className={`progress-bar ${algorithmType === 'bfs' ? 'bfs' : ''}`} style={{ width: `${memoryPercentage}%` }}></div>
              <div className="theoretical-limit" style={{ left: `${theoreticalLimitPercent}%` }} title={`Limit: ${mathParams.memoryLimit}`}>
                <span>STCON Limit</span>
              </div>
            </div>
            <p className="memory-info">
              {algorithmType === 'stcon' 
                ? "The algorithm guarantees sublinear space by forgetting paths." 
                : "Standard BFS stores every node it visits, causing memory to explode linearly."}
            </p>
          </div>
        </div>

        <div className="right-panel">
          
          <div className="glass-panel controls-panel">
            <div className="controls-grid">
              <button onClick={() => setIsPlaying(!isPlaying)} disabled={isFinished || isBuildMode} className={`btn ${isPlaying ? 'warning' : 'primary'}`}>
                {isPlaying ? <Pause size={18} /> : <Play size={18} />} {isPlaying ? 'Pause' : 'Auto-Play'}
              </button>
              <button onClick={stepAlgorithm} disabled={isFinished || isPlaying || isBuildMode} className="btn secondary">
                <StepForward size={18} /> Step
              </button>
              <button onClick={resetAlgorithm} className="btn secondary">
                <RotateCcw size={18} /> Reset
              </button>
            </div>

            <div className="speed-control">
              <label>Speed: {speed}ms</label>
              <input type="range" min="50" max="1500" step="50" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            </div>

            <hr className="divider" />

            <h3><Activity size={18} /> Math Parameters</h3>
            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-label">Nodes (n)</span>
                <span className="metric-value">{mathParams.n}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Depth (r)</span>
                <span className="metric-value">{mathParams.r}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Base (k)</span>
                <span className="metric-value">{mathParams.k}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Distance (λ)</span>
                <span className="metric-value">{mathParams.lambd}</span>
              </div>
            </div>

            <hr className="divider" />
            <div className="status-box">
              {isFinished ? (
                 <div className={`result-badge ${result ? 'success' : 'fail'}`}>
                   {result ? 'CONNECTED' : 'DISCONNECTED'}
                 </div>
              ) : (
                <div className="searching-badge">Ready / Searching...</div>
              )}
            </div>
          </div>
          
          <div className="glass-panel logs-panel">
            <div className="panel-header">
              <h3><List size={18} /> Live Logs</h3>
            </div>
            <ul className="logs">
              {logs.map((log, i) => (
                <li key={i} className={i === logs.length - 1 ? 'latest' : ''}>{log}</li>
              ))}
            </ul>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default App;
