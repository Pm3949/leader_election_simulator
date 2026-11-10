import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Network,
  Activity,
  Layers,
  BarChart3,
  BookOpen,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Keyboard,
  X
} from 'lucide-react';

import Controls from './components/Controls';
import NetworkCanvas from './components/NetworkCanvas';
import TimelineBar from './components/TimelineBar';
import StorylineDrawer from './components/StorylineDrawer';
import NodeInspector from './components/NodeInspector';
import ComplexityDashboard from './components/ComplexityDashboard';
import { DEFAULT_ALGORITHMS } from './algorithmsData';

const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

export default function App() {
  const [algorithms, setAlgorithms] = useState(DEFAULT_ALGORITHMS);
  const [selectedAlg, setSelectedAlg] = useState('BasicLE-Ring');
  const [nodeCount, setNodeCount] = useState(8);
  const [seed, setSeed] = useState(7);
  const [idMode, setIdMode] = useState('Sequential');
  const [topology, setTopology] = useState('Cycle');

  // Navigation tab: 'visualizer' | 'complexity' | 'theory'
  const [activeView, setActiveView] = useState('visualizer');

  // Workspace panel toggles for distraction-free / wide canvas viewing
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightDrawer, setShowRightDrawer] = useState(true);

  const [simData, setSimData] = useState(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Packet Motion & Freeze state synchronized with TimelineBar
  const [isMotionPaused, setIsMotionPaused] = useState(false);
  const [packetProgress, setPacketProgress] = useState(0.5);
  const pausedTimeRef = useRef(0.5);

  const playTimerRef = useRef(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // 1. Fetch available algorithms on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/algorithms`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAlgorithms(data);
          setBackendConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Using bundled algorithms fallback:', err);
        setBackendConnected(false);
      });
  }, []);

  // 2. Run simulation
  const runSimulation = () => {
    if (!selectedAlg) return;
    setLoading(true);
    setErrorMessage(null);
    setIsPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);

    fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        algorithm: selectedAlg,
        nodes: nodeCount,
        seed: seed,
        id_mode: idMode,
        topology: topology,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSimData(data);
        setCurrentRound(0);
        setLoading(false);
        setBackendConnected(true);
      })
      .catch((err) => {
        console.error('Simulation error:', err);
        const failMessage = API_BASE
          ? `Backend (${API_BASE}) offline or spinning up. Free-tier Render takes ~40-50s to wake from sleep. Please wait and click Retry.`
          : 'Simulation engine offline. Ensure backend is running or set VITE_API_URL.';
        setErrorMessage(failMessage);
        setBackendConnected(false);
        setLoading(false);
      });
  };

  useEffect(() => {
    runSimulation();
  }, [selectedAlg, nodeCount, seed, idMode, topology]);

  // 3. Play / Pause Autoplay Engine
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      return;
    }

    const interval = Math.max(700, 2000 / speed);
    playTimerRef.current = setInterval(() => {
      setCurrentRound((prev) => {
        if (!simData || prev >= simData.total_rounds) {
          setIsPlaying(false);
          clearInterval(playTimerRef.current);
          return prev;
        }
        const next = prev + 1;
        if (next === simData.total_rounds) {
          confetti({
            particleCount: 70,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
        return next;
      });
    }, interval);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speed, simData]);

  // Continuous loop animation for packet progress when not frozen
  useEffect(() => {
    if (isMotionPaused) return;
    let animId;
    let start = performance.now() - (pausedTimeRef.current * 2200);
    const loop = (now) => {
      const elapsed = (now - start) / 1000;
      const cycle = (elapsed % 2.2) / 2.2;
      setPacketProgress(cycle);
      pausedTimeRef.current = cycle;
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isMotionPaused]);

  // 4. Keyboard Shortcuts for Pro UX
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (simData && currentRound < simData.total_rounds) {
          setCurrentRound((prev) => prev + 1);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setCurrentRound((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'f' || e.key === 'F') {
        setIsMotionPaused((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        setIsPlaying(false);
        setCurrentRound(0);
      } else if (e.key === '?') {
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simData, currentRound]);

  // Current round data
  const currentRoundData = simData?.rounds?.[currentRound] || null;
  const isFinished = currentRoundData?.finished || false;
  const currentAlgObj = algorithms.find((a) => a.name === selectedAlg) || algorithms[0] || {};

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* 1. TOP HEADER */}
      <header className="h-13 bg-[#0c0c0f] border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between select-none z-30 shrink-0">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
            <Network size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs tracking-tight text-zinc-100">
                Leader Election Simulator
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/80">
                Pandurangan Ch. 5
              </span>
            </div>
          </div>
        </div>

        {/* Center: Segmented View Navigation */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          <button
            onClick={() => setActiveView('visualizer')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === 'visualizer'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity size={13} />
            <span>Network Canvas</span>
          </button>

          <button
            onClick={() => setActiveView('complexity')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === 'complexity'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 size={13} />
            <span>Complexity Analytics</span>
          </button>

          <button
            onClick={() => setActiveView('theory')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeView === 'theory'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen size={13} />
            <span>Theory & Invariants</span>
          </button>
        </div>

        {/* Right Status & Tools */}
        <div className="flex items-center gap-2.5">
          {activeView === 'visualizer' && (
            <div className="hidden lg:flex items-center gap-1 border-r border-zinc-800 pr-2.5">
              <button
                onClick={() => setShowShortcutsModal(true)}
                title="Keyboard Shortcuts (?)"
                className="px-2 py-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded text-xs font-mono font-medium flex items-center gap-1 transition-colors"
              >
                <Keyboard size={13} />
                <span className="text-[10px]">?</span>
              </button>
              <button
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                title={showLeftSidebar ? 'Collapse Controls' : 'Expand Controls'}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              >
                {showLeftSidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
              <button
                onClick={() => setShowRightDrawer(!showRightDrawer)}
                title={showRightDrawer ? 'Collapse Telemetry' : 'Expand Telemetry'}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
              >
                {showRightDrawer ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              </button>
            </div>
          )}

          {/* Engine Connectivity Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {backendConnected ? (
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="hidden sm:inline">Engine Live</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/70 border-b border-rose-900 px-4 py-2 text-xs text-rose-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={runSimulation}
            className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-white rounded font-mono text-[10px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Controls Panel */}
        {showLeftSidebar && activeView === 'visualizer' && (
          <div className="w-72 lg:w-80 h-full shrink-0 border-r border-zinc-800 z-20">
            <Controls
              algorithms={algorithms}
              selectedAlg={selectedAlg}
              onSelectAlg={(alg) => setSelectedAlg(alg)}
              nodeCount={nodeCount}
              onChangeNodeCount={(n) => setNodeCount(n)}
              seed={seed}
              onChangeSeed={(s) => setSeed(s)}
              idMode={idMode}
              onChangeIdMode={(m) => setIdMode(m)}
              topology={topology}
              onChangeTopology={(t) => setTopology(t)}
              onReset={runSimulation}
              loading={loading}
            />
          </div>
        )}

        {/* Center Visualizer Workspace */}
        {activeView === 'visualizer' && (
          <>
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
              <div className="flex-1 relative overflow-hidden">
                <NetworkCanvas
                  graph={simData?.graph}
                  currentRoundData={currentRoundData}
                  selectedNode={selectedNode}
                  onSelectNode={(id) => setSelectedNode(id)}
                  isFinished={isFinished}
                  isMotionPaused={isMotionPaused}
                  animTime={packetProgress}
                />
              </div>

              {/* Master Playback & Flight Controller */}
              <TimelineBar
                currentRound={currentRound}
                totalRounds={simData?.total_rounds || 0}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onStepForward={() => {
                  if (simData && currentRound < simData.total_rounds) {
                    setCurrentRound(currentRound + 1);
                  }
                }}
                onStepBackward={() => {
                  if (currentRound > 0) {
                    setCurrentRound(currentRound - 1);
                  }
                }}
                onRestart={() => {
                  setIsPlaying(false);
                  setCurrentRound(0);
                }}
                onFastForward={() => {
                  if (simData) {
                    setIsPlaying(false);
                    setCurrentRound(simData.total_rounds);
                    confetti({
                      particleCount: 70,
                      spread: 70,
                      origin: { y: 0.6 },
                    });
                  }
                }}
                onSeek={(r) => {
                  setIsPlaying(false);
                  setCurrentRound(r);
                }}
                speed={speed}
                onChangeSpeed={(s) => setSpeed(s)}
                messageCount={currentRoundData?.message_count ?? 0}
                isFinished={isFinished}
                isMotionPaused={isMotionPaused}
                onToggleFreezeMotion={() => setIsMotionPaused(!isMotionPaused)}
                packetProgress={packetProgress}
                onSeekPacketProgress={(val) => {
                  setIsMotionPaused(true);
                  setPacketProgress(val);
                  pausedTimeRef.current = val;
                }}
              />
            </div>

            {/* Right: Telemetry & In-Flight Drawer */}
            {showRightDrawer && (
              <div className="w-80 lg:w-96 h-full shrink-0 border-l border-zinc-800 z-20">
                <StorylineDrawer
                  currentRoundData={currentRoundData}
                  allEvents={simData?.rounds?.flatMap((r) => r.events || []) || []}
                  nodes={simData?.graph?.nodes || []}
                  onSelectNode={(id) => setSelectedNode(id)}
                />
              </div>
            )}
          </>
        )}

        {/* Complexity Analytics Tab */}
        {activeView === 'complexity' && (
          <div className="flex-1 h-full overflow-hidden">
            <ComplexityDashboard
              simData={simData}
              selectedAlg={selectedAlg}
              nodeCount={nodeCount}
            />
          </div>
        )}

        {/* Theory & Invariants Tab */}
        {activeView === 'theory' && (
          <div className="flex-1 h-full overflow-y-auto p-8 bg-[#09090b] flex flex-col gap-5 max-w-4xl mx-auto text-zinc-300">
            <div className="border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-1.5 text-zinc-400 font-medium text-xs uppercase tracking-wider mb-1">
                <BookOpen size={14} />
                <span>Chapter 5 Formal Invariants</span>
              </div>
              <h2 className="text-xl font-bold text-zinc-100">
                {currentAlgObj.title || currentAlgObj.name}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {currentAlgObj.summary || currentAlgObj.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-zinc-500 text-[10.5px] font-semibold uppercase tracking-wider">Topology Model</div>
                <div className="text-base font-semibold text-zinc-200 font-mono mt-1 capitalize">
                  {currentAlgObj.topology} Graph
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-zinc-500 text-[10.5px] font-semibold uppercase tracking-wider">Asymptotic Bound</div>
                <div className="text-base font-semibold text-emerald-400 font-mono mt-1">
                  {currentAlgObj.complexity}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Step-by-Step Protocol Invariants
              </h3>
              {(currentAlgObj.steps || []).map((st, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[9.5px] font-medium">
                      {st.tag || `STEP ${st.step_number}`}
                    </span>
                    <span className="font-semibold text-zinc-200 text-xs">
                      {st.title}
                    </span>
                  </div>
                  <div
                    className="text-zinc-400 text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: st.content }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. NODE INSPECTOR SLIDEOUT */}
      {selectedNode !== null && (
        <NodeInspector
          nodeId={selectedNode}
          graph={simData?.graph}
          currentRoundData={currentRoundData}
          allRounds={simData?.rounds || []}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* 4. KEYBOARD SHORTCUTS MODAL */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-zinc-400" />
                <h3 className="font-semibold text-sm text-zinc-100">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Play / Pause Execution</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">Space</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Step One Round Forward</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">&rarr;</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Step One Round Backward</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">&larr;</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Freeze / Resume Messages Mid-Flight</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">F</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/60">
                <span className="text-zinc-400">Reset to Round 0</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">R</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-400">Close Slideout / Modal</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
