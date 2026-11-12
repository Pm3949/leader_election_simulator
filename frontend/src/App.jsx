import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Network,
  Activity,
  BarChart3,
  BookOpen,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Keyboard,
  X,
  Sun,
  Moon
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
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('le_sim_theme') || 'dark';
    }
    return 'dark';
  });
  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('le_sim_theme', theme);
  }, [theme, isDark]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const [algorithms, setAlgorithms] = useState(DEFAULT_ALGORITHMS);
  const [selectedAlg, setSelectedAlg] = useState('BasicLE-Ring');
  const [nodeCount, setNodeCount] = useState(8);
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
  const [packetProgress, setPacketProgress] = useState(0);
  const loopProgressRef = useRef(0);
  const [animRunId, setAnimRunId] = useState(0);

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
        seed: 7,
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
  }, [selectedAlg, nodeCount, idMode, topology]);

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

  // When switching into Autoplay (Run button), unfreeze packets so they finish 0 -> 100%
  useEffect(() => {
    if (isPlaying && loopProgressRef.current < 1.0) {
      setIsMotionPaused(false);
    }
  }, [isPlaying]);

  // Reset packet animation on every round or simulation change:
  // Autoplay (Run): plays 0% -> 100%. Step-by-step: plays 0% -> 60% and freezes.
  useEffect(() => {
    loopProgressRef.current = 0;
    setPacketProgress(0);
    setIsMotionPaused(false);
    setAnimRunId((id) => id + 1);
  }, [currentRound, simData]);

  // Packet animation: 0 -> 1.0 (100%) during Run autoplay, 0 -> 0.60 (60%) when stepping
  useEffect(() => {
    if (isMotionPaused) return;
    let animId;
    const targetStop = isPlaying ? 1.0 : 0.6;
    const cycleMs = isPlaying
      ? Math.max(550, Math.max(700, 2000 / speed) * 0.88)
      : 1400 / speed;
    const startLoopProgress = loopProgressRef.current;
    const startTime = performance.now();

    const loop = (now) => {
      const elapsed = now - startTime;
      const nextProgress = startLoopProgress + elapsed / cycleMs;

      if (nextProgress >= targetStop) {
        loopProgressRef.current = targetStop;
        setPacketProgress(targetStop);
        setIsMotionPaused(true);
        return;
      }

      loopProgressRef.current = nextProgress;
      setPacketProgress(nextProgress);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isMotionPaused, animRunId, speed, isPlaying]);

  const toggleFreezeMotion = () => {
    const targetStop = isPlaying ? 1.0 : 0.6;
    if (isMotionPaused) {
      if (loopProgressRef.current >= targetStop) {
        loopProgressRef.current = 0;
        setPacketProgress(0);
        setAnimRunId((id) => id + 1);
      }
      setIsMotionPaused(false);
    } else {
      setIsMotionPaused(true);
    }
  };

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
        toggleFreezeMotion();
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
  }, [simData, currentRound, isMotionPaused]);

  // Current round data
  const currentRoundData = simData?.rounds?.[currentRound] || null;
  const isFinished = currentRoundData?.finished || false;
  const currentAlgObj = algorithms.find((a) => a.name === selectedAlg) || algorithms[0] || {};

  const navTabClass = (viewKey) =>
    `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
      activeView === viewKey
        ? isDark
          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
          : 'bg-white text-slate-900 shadow-sm border border-slate-200'
        : isDark
        ? 'text-zinc-400 hover:text-zinc-200'
        : 'text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 1. TOP HEADER */}
      <header
        className={`h-13 border-b px-4 sm:px-6 flex items-center justify-between select-none z-30 shrink-0 transition-colors duration-200 ${
          isDark ? 'bg-[#0c0c0f] border-zinc-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg border flex items-center justify-center ${
              isDark
                ? 'bg-zinc-800 border-zinc-700/80 text-zinc-200'
                : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <Network size={15} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-xs tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                Leader Election Simulator
              </span>
              <span
                className={`hidden md:inline-block px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700/80'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                Synchronous Model
              </span>
            </div>
          </div>
        </div>

        {/* Center: Segmented View Navigation */}
        <div
          className={`flex items-center border rounded-lg p-0.5 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button onClick={() => setActiveView('visualizer')} className={navTabClass('visualizer')}>
            <Activity size={13} />
            <span>Network Canvas</span>
          </button>

          <button onClick={() => setActiveView('complexity')} className={navTabClass('complexity')}>
            <BarChart3 size={13} />
            <span>Complexity Analytics</span>
          </button>

          <button onClick={() => setActiveView('theory')} className={navTabClass('theory')}>
            <BookOpen size={13} />
            <span>Theory & Invariants</span>
          </button>
        </div>

        {/* Right Status & Tools */}
        <div className="flex items-center gap-2.5">
          {activeView === 'visualizer' && (
            <div
              className={`hidden lg:flex items-center gap-1 border-r pr-2.5 ${
                isDark ? 'border-zinc-800' : 'border-slate-200'
              }`}
            >
              <button
                onClick={() => setShowShortcutsModal(true)}
                title="Keyboard Shortcuts (?)"
                className={`px-2 py-1 rounded text-xs font-mono font-medium flex items-center gap-1 transition-colors ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Keyboard size={13} />
                <span className="text-[10px]">?</span>
              </button>
              <button
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                title={showLeftSidebar ? 'Collapse Controls' : 'Expand Controls'}
                className={`p-1.5 rounded transition-colors ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {showLeftSidebar ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
              </button>
              <button
                onClick={() => setShowRightDrawer(!showRightDrawer)}
                title={showRightDrawer ? 'Collapse Telemetry' : 'Expand Telemetry'}
                className={`p-1.5 rounded transition-colors ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {showRightDrawer ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              </button>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle color theme"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isDark
                ? 'bg-zinc-900 border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-800'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-sky-600" />}
            <span className="hidden sm:inline text-[11px]">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Engine Connectivity Badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {backendConnected ? (
              <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="hidden sm:inline">Engine Live</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div
          className={`border-b px-4 py-2 text-xs flex items-center justify-between shrink-0 ${
            isDark
              ? 'bg-rose-950/70 border-rose-900 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className={`shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={runSimulation}
            className={`px-2 py-0.5 rounded font-mono text-[10px] ${
              isDark
                ? 'bg-rose-900 hover:bg-rose-800 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Controls Panel */}
        {showLeftSidebar && activeView === 'visualizer' && (
          <div className={`w-72 lg:w-80 h-full shrink-0 border-r z-20 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <Controls
              algorithms={algorithms}
              selectedAlg={selectedAlg}
              onSelectAlg={(alg) => setSelectedAlg(alg)}
              nodeCount={nodeCount}
              onChangeNodeCount={(n) => setNodeCount(n)}
              idMode={idMode}
              onChangeIdMode={(m) => setIdMode(m)}
              topology={topology}
              onChangeTopology={(t) => setTopology(t)}
              onReset={runSimulation}
              loading={loading}
              isDark={isDark}
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
                  isDark={isDark}
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
                onToggleFreezeMotion={toggleFreezeMotion}
                packetProgress={packetProgress}
                onSeekPacketProgress={(val) => {
                  setIsMotionPaused(true);
                  setPacketProgress(val);
                  loopProgressRef.current = val;
                }}
                isDark={isDark}
              />
            </div>

            {/* Right: Telemetry & In-Flight Drawer */}
            {showRightDrawer && (
              <div className={`w-80 lg:w-96 h-full shrink-0 border-l z-20 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                <StorylineDrawer
                  currentRoundData={currentRoundData}
                  allEvents={simData?.rounds?.flatMap((r) => r.events || []) || []}
                  nodes={simData?.graph?.nodes || []}
                  onSelectNode={(id) => setSelectedNode(id)}
                  isDark={isDark}
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
              isDark={isDark}
            />
          </div>
        )}

        {/* Theory & Invariants Tab */}
        {activeView === 'theory' && (
          <div className={`flex-1 h-full overflow-y-auto transition-colors duration-200 ${isDark ? 'bg-[#09090b]' : 'bg-slate-50'}`}>
            <div
              className={`p-8 flex flex-col gap-5 max-w-4xl mx-auto ${
                isDark ? 'text-zinc-300' : 'text-slate-700'
              }`}
            >
              <div className={`border-b pb-4 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                <div
                  className={`flex items-center gap-1.5 font-medium text-xs uppercase tracking-wider mb-1 ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}
                >
                  <BookOpen size={14} />
                  <span>Protocol Formal Invariants</span>
                </div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  {currentAlgObj.title || currentAlgObj.name}
                </h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                  {currentAlgObj.summary || currentAlgObj.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Topology Model
                  </div>
                  <div className={`text-base font-semibold font-mono mt-1 capitalize ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    {currentAlgObj.topology} Graph
                  </div>
                </div>
                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    Asymptotic Bound
                  </div>
                  <div className={`text-base font-semibold font-mono mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {currentAlgObj.complexity}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Step-by-Step Protocol Invariants
                </h3>
                {(currentAlgObj.steps || []).map((st, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                      isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[9.5px] font-medium ${
                          isDark
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {st.tag || `STEP ${st.step_number}`}
                      </span>
                      <span className={`font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                        {st.title}
                      </span>
                    </div>
                    <div
                      className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}
                      dangerouslySetInnerHTML={{ __html: st.content }}
                    />
                  </div>
                ))}
              </div>
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
          isDark={isDark}
        />
      )}

      {/* 4. KEYBOARD SHORTCUTS MODAL */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className={`w-full max-w-md border rounded-2xl p-5 shadow-2xl flex flex-col gap-4 ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? 'border-zinc-800' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Keyboard size={16} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
                <h3 className={`font-semibold text-sm ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className={`p-1 rounded ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {[
                { label: 'Play / Pause Execution', key: 'Space' },
                { label: 'Step One Round Forward', key: '→' },
                { label: 'Step One Round Backward', key: '←' },
                { label: 'Freeze / Resume Messages Mid-Flight', key: 'F' },
                { label: 'Reset to Round 0', key: 'R' },
                { label: 'Close Slideout / Modal', key: 'Esc' },
              ].map((item, i, arr) => (
                <div
                  key={item.key}
                  className={`flex items-center justify-between py-1.5 ${
                    i < arr.length - 1
                      ? `border-b ${isDark ? 'border-zinc-800/60' : 'border-slate-200'}`
                      : ''
                  }`}
                >
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>{item.label}</span>
                  <kbd
                    className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                        : 'bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
