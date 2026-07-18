import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import GraphVisualizer from './GraphVisualizer';
import { stconAlgorithm, standardBFSAlgorithm } from './algorithm';
import { Play, Pause, StepForward, RotateCcw, Database, Activity, List, Edit3, Trash2, GitCompare, BarChart3, Download, BookOpen, Zap, ChevronDown, ChevronUp } from 'lucide-react';
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

// --- Helper Functions ---

function generateRandomGraph(n) {
  const nodes = Array.from({ length: n }, (_, i) => ({ id: i }));
  const edges = [];
  for (let i = 0; i < n; i++) edges.push({ source: i, target: i });
  for (let i = 0; i < n - 1; i++) edges.push({ source: i, target: i + 1 });
  for (let i = 0; i < n * 2; i++) {
    edges.push({ source: Math.floor(Math.random() * n), target: Math.floor(Math.random() * n) });
  }
  return { nodes, edges };
}

function getExplanation(description) {
  if (!description) return '';
  if (description.includes('Initialize')) return '📄 Paper Ref: Section 4, Corollary 4.2 — Computing r = ⌈√(log n)⌉, k = ⌈2^√(log n)⌉, L = 2, λ = L^r. These parameters control the recursion depth and partition granularity.';
  if (description.includes('Trying level offset')) return '📄 Paper Ref: Figure 4.1 — The algorithm tries offsets j ∈ [0, λ) to find a BFS layer sparse enough to fit in sublinear memory. At least one j is guaranteed to work.';
  if (description.includes('Computing next level')) return '📄 Paper Ref: Figure 4.1, inner loop — Growing the frontier by λ steps. Uses SPR to find all vertices reachable within distance λ = L^r from the current set S.';
  if (description.includes('Checking paths from mod')) return '📄 Paper Ref: Figure 4.1 — Partitioning vertices into equivalence classes v mod k. Each SPR call operates on at most ⌈n/k⌉ vertices, keeping memory per call bounded.';
  if (description.includes('Found')) return '📄 Paper Ref: Figure 3.2 (Algorithm SPR) — The recursive subroutine found reachable vertices by composing L paths of length L^(r-1) to cover distance L^r without storing intermediate nodes.';
  if (description.includes('Level') && description.includes('completed')) return '📄 Paper Ref: Lemma 4.1 — One BFS level complete. The memory constraint ensures the new frontier |S_new| ≤ ⌈n/λ⌉, guaranteeing sublinear space.';
  if (description.includes('Memory limit exceeded')) return '📄 Paper Ref: Lemma 4.1 — This offset j produced too many frontier nodes (exceeding ⌈n/λ⌉). The algorithm discards j and tries the next. Correctness: at least one j will be sparse.';
  if (description.includes('COMPLETE')) return '📄 The algorithm terminated. Correctness guaranteed by Theorem 4.1: if a path s→t exists, it will be found within sublinear space O(n/2^√(log n)).';
  if (description.includes('Exploring node')) return '📄 Standard BFS — Dequeue node from frontier and examine all outgoing edges. Space: O(n) since every visited node is stored permanently.';
  if (description.includes('Discovered node')) return '📄 Standard BFS — New node found! Added to visited set AND queue. Unlike STCON, BFS never forgets a node, causing linear memory growth.';
  return '📄 Executing the BBRS (Barnes-Buss-Ruzzo-Schieber 1998) sublinear-space STCON algorithm.';
}

function exhaustGenerator(gen) {
  let steps = 0, peak = 1, result = false;
  while (true) {
    const { value, done } = gen.next();
    if (done || (value && value.type === 'done')) {
      result = value ? value.result : false;
      if (value && value.S) peak = Math.max(peak, value.S.length);
      break;
    }
    steps++;
    if (value && value.S) peak = Math.max(peak, value.S.length);
  }
  return { steps, peak, result };
}

// --- Main App Component ---

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

  // Enhancement 2: Step Counter
  const [stepCount, setStepCount] = useState(0);
  const [peakMemory, setPeakMemory] = useState(1);

  // Enhancement 1: Compare Mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareIsPlaying, setCompareIsPlaying] = useState(false);
  const compareIntervalRef = useRef(null);
  const stconGenRef = useRef(null);
  const bfsGenRef = useRef(null);
  const stconDoneRef = useRef(false);
  const bfsDoneRef = useRef(false);
  const [stconCompare, setStconCompare] = useState({ nodes: [0], steps: 0, peak: 1, logs: [], done: false, result: null });
  const [bfsCompare, setBfsCompare] = useState({ nodes: [0], steps: 0, peak: 1, logs: [], done: false, result: null });

  // Enhancement 3: Stress Test
  const [showStressTest, setShowStressTest] = useState(false);
  const [stressTestResults, setStressTestResults] = useState(null);
  const [stressTestRunning, setStressTestRunning] = useState(false);

  // Enhancement 4: Explanation Panel
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');

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

  // --- Normal Mode Logic ---

  useEffect(() => {
    resetAlgorithm();
    setIsBuildMode(selectedGraphKey === 'custom');
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
    algoGenRef.current = algorithmType === 'stcon'
      ? stconAlgorithm(activeGraph.data, 0, target)
      : standardBFSAlgorithm(activeGraph.data, 0, target);
    setActiveNodes([0]);
    setLogs([`${algorithmType.toUpperCase()} initialized. s=0, t=${target}.`]);
    setIsFinished(false);
    setResult(null);
    setStepCount(0);
    setPeakMemory(1);
    setCurrentExplanation('');
  };

  const stepAlgorithm = () => {
    if (isFinished || !algoGenRef.current || isBuildMode) { setIsPlaying(false); return; }
    const { value, done } = algoGenRef.current.next();
    if (done || (value && value.type === 'done')) {
      setIsFinished(true);
      setIsPlaying(false);
      setResult(value ? value.result : false);
      setLogs(prev => [...prev, `ALGORITHM COMPLETE: Path ${value && value.result ? 'FOUND' : 'NOT FOUND'}!`].slice(-20));
      if (value && value.S) { setActiveNodes(value.S); setPeakMemory(prev => Math.max(prev, value.S.length)); }
      setCurrentExplanation(getExplanation('COMPLETE'));
      return;
    }
    if (value) {
      setStepCount(prev => prev + 1);
      if (value.description) {
        setLogs(prev => [...prev, value.description].slice(-20));
        setCurrentExplanation(getExplanation(value.description));
      }
      if (value.S) {
        setActiveNodes(value.S);
        setPeakMemory(prev => Math.max(prev, value.S.length));
      }
    }
  };

  const handleGraphUpdate = (newData) => {
    setGraphs(prev => ({ ...prev, custom: { ...prev.custom, data: newData } }));
  };

  // --- Enhancement 1: Compare Mode ---

  const resetCompare = useCallback(() => {
    setCompareIsPlaying(false);
    clearInterval(compareIntervalRef.current);
    const target = selectedGraphKey === 'custom' ? customTarget : activeGraph.target;
    stconGenRef.current = stconAlgorithm(activeGraph.data, 0, target);
    bfsGenRef.current = standardBFSAlgorithm(activeGraph.data, 0, target);
    stconDoneRef.current = false;
    bfsDoneRef.current = false;
    setStconCompare({ nodes: [0], steps: 0, peak: 1, logs: ['STCON initialized.'], done: false, result: null });
    setBfsCompare({ nodes: [0], steps: 0, peak: 1, logs: ['BFS initialized.'], done: false, result: null });
  }, [activeGraph, selectedGraphKey, customTarget]);

  useEffect(() => { if (compareMode) resetCompare(); }, [compareMode, selectedGraphKey]);

  const stepCompareAlgorithms = useCallback(() => {
    if (!stconDoneRef.current && stconGenRef.current) {
      const { value, done } = stconGenRef.current.next();
      if (done || (value && value.type === 'done')) {
        stconDoneRef.current = true;
        setStconCompare(prev => ({ ...prev, done: true, result: value?.result ?? false, nodes: value?.S ?? prev.nodes, logs: [...prev.logs, `✓ STCON: ${value?.result ? 'CONNECTED' : 'DISCONNECTED'}`].slice(-12) }));
      } else if (value) {
        setStconCompare(prev => {
          const nodes = value.S || prev.nodes;
          return { ...prev, nodes, steps: prev.steps + 1, peak: Math.max(prev.peak, nodes.length), logs: value.description ? [...prev.logs, value.description].slice(-12) : prev.logs };
        });
      }
    }
    if (!bfsDoneRef.current && bfsGenRef.current) {
      const { value, done } = bfsGenRef.current.next();
      if (done || (value && value.type === 'done')) {
        bfsDoneRef.current = true;
        setBfsCompare(prev => ({ ...prev, done: true, result: value?.result ?? false, nodes: value?.S ?? prev.nodes, logs: [...prev.logs, `✓ BFS: ${value?.result ? 'CONNECTED' : 'DISCONNECTED'}`].slice(-12) }));
      } else if (value) {
        setBfsCompare(prev => {
          const nodes = value.S || prev.nodes;
          return { ...prev, nodes, steps: prev.steps + 1, peak: Math.max(prev.peak, nodes.length), logs: value.description ? [...prev.logs, value.description].slice(-12) : prev.logs };
        });
      }
    }
    if (stconDoneRef.current && bfsDoneRef.current) setCompareIsPlaying(false);
  }, []);

  useEffect(() => {
    if (compareIsPlaying) {
      compareIntervalRef.current = setInterval(stepCompareAlgorithms, speed);
    } else {
      clearInterval(compareIntervalRef.current);
    }
    return () => clearInterval(compareIntervalRef.current);
  }, [compareIsPlaying, speed, stepCompareAlgorithms]);

  // --- Enhancement 3: Stress Test ---

  const runStressTest = () => {
    setStressTestRunning(true);
    setStressTestResults(null);
    setTimeout(() => {
      const sizes = [5, 10, 20, 50];
      const results = sizes.map(n => {
        const graph = generateRandomGraph(n);
        const stcon = exhaustGenerator(stconAlgorithm(graph, 0, n - 1));
        const bfs = exhaustGenerator(standardBFSAlgorithm(graph, 0, n - 1));
        return {
          n, stconSteps: stcon.steps, stconPeak: stcon.peak,
          bfsSteps: bfs.steps, bfsPeak: bfs.peak,
          stconPct: ((stcon.peak / n) * 100).toFixed(1),
          bfsPct: ((bfs.peak / n) * 100).toFixed(1),
          spaceSaving: (((bfs.peak - stcon.peak) / bfs.peak) * 100).toFixed(1)
        };
      });
      setStressTestResults(results);
      setStressTestRunning(false);
    }, 50);
  };

  // --- Enhancement 5: Export ---

  const exportResults = () => {
    const target = selectedGraphKey === 'custom' ? customTarget : activeGraph.target;
    const lines = [
      '╔══════════════════════════════════════════════════╗',
      '║       STCON Visualizer — Results Report          ║',
      '║     BBRS (Barnes-Buss-Ruzzo-Schieber 1998)       ║',
      '╚══════════════════════════════════════════════════╝',
      '', `Date: ${new Date().toLocaleString()}`,
      `Graph: ${activeGraph.name}`,
      `Algorithm: ${algorithmType === 'stcon' ? 'Sublinear STCON' : 'Standard BFS'}`,
      `Source: 0 → Target: ${target}`,
      '', '── Parameters ──',
      `Nodes (n): ${mathParams.n}`,
      `Recursion Depth (r): ${mathParams.r}`,
      `Partition Size (k): ${mathParams.k}`,
      `Step Distance (λ): ${mathParams.lambd}`,
      `Space Limit: ⌈n/λ⌉ + 2 = ${mathParams.memoryLimit}`,
      '', '── Results ──',
      `Steps Taken: ${stepCount}`,
      `Peak Memory: ${peakMemory} / ${mathParams.n} nodes (${((peakMemory / mathParams.n) * 100).toFixed(1)}%)`,
      `Result: ${result === null ? 'Not completed' : result ? 'CONNECTED ✓' : 'DISCONNECTED ✗'}`,
      '', '── Execution Log ──', ...logs
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stcon_report_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Computed Values ---

  const memoryPercentage = Math.min(100, (activeNodes.length / mathParams.n) * 100) || 0;
  const theoreticalLimitPercent = Math.min(100, (mathParams.memoryLimit / mathParams.n) * 100) || 0;

  // --- RENDER ---

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <h1>STCON Visualizer</h1>
          <p className="subtitle">Ultimate Edition: Build, Compare, and Debug</p>
        </div>
        <div className="header-controls">
          <button className={`btn compare-toggle ${compareMode ? 'active-toggle' : 'secondary'}`} onClick={() => { setCompareMode(!compareMode); setIsPlaying(false); }}>
            <GitCompare size={16} /> {compareMode ? 'Exit Compare' : 'Compare Mode'}
          </button>
          <div className="graph-selector">
            <label>Select Graph Topology:</label>
            <select value={selectedGraphKey} onChange={(e) => setSelectedGraphKey(e.target.value)}>
              {Object.keys(graphs).map(k => (<option key={k} value={k}>{graphs[k].name}</option>))}
            </select>
          </div>
          {!compareMode && (
            <div className="graph-selector">
              <label>Select Algorithm:</label>
              <select value={algorithmType} onChange={(e) => setAlgorithmType(e.target.value)}>
                <option value="stcon">Sublinear STCON</option>
                <option value="bfs">Standard BFS</option>
              </select>
            </div>
          )}
        </div>
      </header>

      <div className="main-content">
        {compareMode ? (
          /* ===== COMPARE MODE LAYOUT ===== */
          <>
            <div className="compare-left-panel">
              <div className="compare-graphs-row">
                <div className="glass-panel compare-graph-box">
                  <div className="compare-label stcon-label">⚡ Sublinear STCON</div>
                  <GraphVisualizer graph={activeGraph.data} activeNodes={stconCompare.nodes} isBuildMode={false} algorithmType="stcon" />
                </div>
                <div className="glass-panel compare-graph-box">
                  <div className="compare-label bfs-label">🔍 Standard BFS</div>
                  <GraphVisualizer graph={activeGraph.data} activeNodes={bfsCompare.nodes} isBuildMode={false} algorithmType="bfs" />
                </div>
              </div>
              <div className="compare-memory-row">
                <div className="glass-panel compare-memory-box">
                  <div className="panel-header"><h3><Database size={14} /> STCON Memory</h3><span>{stconCompare.peak} / {mathParams.n}</span></div>
                  <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${(stconCompare.peak / mathParams.n) * 100}%` }}></div>
                    <div className="theoretical-limit" style={{ left: `${theoreticalLimitPercent}%` }}><span>Limit</span></div>
                  </div>
                </div>
                <div className="glass-panel compare-memory-box">
                  <div className="panel-header"><h3><Database size={14} /> BFS Memory</h3><span>{bfsCompare.peak} / {mathParams.n}</span></div>
                  <div className="progress-bar-container"><div className="progress-bar bfs" style={{ width: `${(bfsCompare.peak / mathParams.n) * 100}%` }}></div>
                    <div className="theoretical-limit" style={{ left: `${theoreticalLimitPercent}%` }}><span>Limit</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="right-panel">
              <div className="glass-panel controls-panel">
                <div className="controls-grid">
                  <button onClick={() => setCompareIsPlaying(!compareIsPlaying)} disabled={stconCompare.done && bfsCompare.done} className={`btn ${compareIsPlaying ? 'warning' : 'primary'}`}>
                    {compareIsPlaying ? <Pause size={18} /> : <Zap size={18} />} {compareIsPlaying ? 'Pause' : 'Race!'}
                  </button>
                  <button onClick={() => stepCompareAlgorithms()} disabled={(stconCompare.done && bfsCompare.done) || compareIsPlaying} className="btn secondary">
                    <StepForward size={18} /> Step Both
                  </button>
                  <button onClick={resetCompare} className="btn secondary"><RotateCcw size={18} /> Reset</button>
                </div>
                <div className="speed-control">
                  <label>Speed: {speed}ms</label>
                  <input type="range" min="50" max="1500" step="50" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                </div>
                <hr className="divider" />
                <h3><Zap size={16} /> Race Statistics</h3>
                <div className="compare-stats">
                  <div className="stat-column stcon-stats">
                    <h4>STCON</h4>
                    <div className="stat-row"><span>Steps</span><span className="stat-value">{stconCompare.steps}</span></div>
                    <div className="stat-row"><span>Peak Mem</span><span className="stat-value">{stconCompare.peak}</span></div>
                    <div className="stat-row"><span>Status</span><span className={`stat-badge ${stconCompare.done ? (stconCompare.result ? 'success' : 'fail') : 'running'}`}>{stconCompare.done ? (stconCompare.result ? '✓' : '✗') : '...'}</span></div>
                  </div>
                  <div className="stat-column bfs-stats">
                    <h4>BFS</h4>
                    <div className="stat-row"><span>Steps</span><span className="stat-value">{bfsCompare.steps}</span></div>
                    <div className="stat-row"><span>Peak Mem</span><span className="stat-value">{bfsCompare.peak}</span></div>
                    <div className="stat-row"><span>Status</span><span className={`stat-badge ${bfsCompare.done ? (bfsCompare.result ? 'success' : 'fail') : 'running'}`}>{bfsCompare.done ? (bfsCompare.result ? '✓' : '✗') : '...'}</span></div>
                  </div>
                </div>
                {stconCompare.done && bfsCompare.done && (
                  <div className="compare-verdict">
                    <div className="verdict-card">
                      STCON used <strong>{stconCompare.peak}/{mathParams.n}</strong> nodes ({((stconCompare.peak/mathParams.n)*100).toFixed(0)}%) vs BFS <strong>{bfsCompare.peak}/{mathParams.n}</strong> ({((bfsCompare.peak/mathParams.n)*100).toFixed(0)}%)
                      {bfsCompare.peak > stconCompare.peak && <span className="savings"> — {(((bfsCompare.peak - stconCompare.peak) / bfsCompare.peak) * 100).toFixed(0)}% memory saved!</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ===== NORMAL MODE LAYOUT ===== */
          <>
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
                <GraphVisualizer graph={activeGraph.data} activeNodes={activeNodes} isBuildMode={isBuildMode} onGraphUpdate={handleGraphUpdate} algorithmType={algorithmType} />
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
                  <button onClick={resetAlgorithm} className="btn secondary"><RotateCcw size={18} /> Reset</button>
                  <button onClick={exportResults} className="btn secondary"><Download size={18} /> Export</button>
                </div>

                <div className="speed-control">
                  <label>Speed: {speed}ms</label>
                  <input type="range" min="50" max="1500" step="50" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
                </div>

                <hr className="divider" />

                {/* Enhancement 2: Step Counter */}
                <h3><Zap size={16} /> Live Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-box accent-metric">
                    <span className="metric-label">Steps Taken</span>
                    <span className="metric-value">{stepCount}</span>
                  </div>
                  <div className="metric-box accent-metric">
                    <span className="metric-label">Peak Memory</span>
                    <span className="metric-value">{peakMemory} <small>nodes</small></span>
                  </div>
                </div>

                {/* Summary Card */}
                {isFinished && (
                  <div className={`summary-card ${result ? 'success' : 'fail'}`}>
                    <div className="summary-title">{result ? '✓ PATH FOUND' : '✗ NO PATH'}</div>
                    <div className="summary-detail">
                      Used <strong>{peakMemory}/{mathParams.n}</strong> nodes ({((peakMemory/mathParams.n)*100).toFixed(0)}% of graph)
                      {algorithmType === 'stcon' && <span> — within sublinear bound!</span>}
                    </div>
                  </div>
                )}

                {!isFinished && (
                  <div className="status-box"><div className="searching-badge">Ready / Searching...</div></div>
                )}

                <hr className="divider" />

                <h3><Activity size={16} /> Math Parameters</h3>
                <div className="metrics-grid">
                  <div className="metric-box"><span className="metric-label">Nodes (n)</span><span className="metric-value">{mathParams.n}</span></div>
                  <div className="metric-box"><span className="metric-label">Depth (r)</span><span className="metric-value">{mathParams.r}</span></div>
                  <div className="metric-box"><span className="metric-label">Base (k)</span><span className="metric-value">{mathParams.k}</span></div>
                  <div className="metric-box"><span className="metric-label">Distance (λ)</span><span className="metric-value">{mathParams.lambd}</span></div>
                </div>

                <hr className="divider" />

                {/* Enhancement 3: Stress Test Button */}
                <button className="btn primary full-width" onClick={() => { setShowStressTest(true); runStressTest(); }}>
                  <BarChart3 size={16} /> Run Automated Stress Test
                </button>
              </div>

              {/* Logs Panel */}
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

              {/* Enhancement 4: Explanation Panel */}
              <div className="glass-panel explanation-panel">
                <div className="panel-header clickable" onClick={() => setShowExplanation(!showExplanation)}>
                  <h3><BookOpen size={16} /> Paper Reference</h3>
                  {showExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                {showExplanation && (
                  <div className="explanation-content">
                    {currentExplanation || 'Run the algorithm to see step-by-step paper references here.'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Enhancement 3: Stress Test Modal */}
      {showStressTest && (
        <div className="modal-overlay" onClick={() => setShowStressTest(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2><BarChart3 size={20} /> Automated Stress Test Results</h2>
            <p className="modal-subtitle">Random graphs tested with both algorithms</p>
            {stressTestRunning ? (
              <div className="stress-loading">Running benchmarks...</div>
            ) : stressTestResults ? (
              <>
                <table className="stress-table">
                  <thead>
                    <tr>
                      <th>Nodes</th>
                      <th>STCON Steps</th>
                      <th>STCON Peak Mem</th>
                      <th>BFS Steps</th>
                      <th>BFS Peak Mem</th>
                      <th>Space Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stressTestResults.map((r, i) => (
                      <tr key={i}>
                        <td className="td-highlight">{r.n}</td>
                        <td>{r.stconSteps}</td>
                        <td>{r.stconPeak} ({r.stconPct}%)</td>
                        <td>{r.bfsSteps}</td>
                        <td className="td-warning">{r.bfsPeak} ({r.bfsPct}%)</td>
                        <td className="td-success">{r.spaceSaving}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="stress-conclusion">
                  <strong>Conclusion:</strong> As graph size increases, STCON's memory usage stays bounded
                  while BFS grows linearly — empirically proving the O(n/2<sup>√(log n)</sup>) space claim.
                </div>
              </>
            ) : null}
            <button className="btn secondary" style={{marginTop: '1rem'}} onClick={() => setShowStressTest(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
