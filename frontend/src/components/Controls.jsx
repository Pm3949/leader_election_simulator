import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sliders,
  Layers,
  GitFork,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function Controls({
  algorithms = [],
  selectedAlg,
  onSelectAlg,
  nodeCount,
  onChangeNodeCount,
  seed,
  onChangeSeed,
  idMode,
  onChangeIdMode,
  topology,
  onChangeTopology,
  onReset,
  loading
}) {
  const [showTheory, setShowTheory] = useState(false);
  const algList = Array.isArray(algorithms) ? algorithms : [];
  const currentAlg = algList.find((a) => a.name === selectedAlg) || algList[0] || {};

  return (
    <div className="flex flex-col gap-4 p-4.5 bg-[#0e0e11] border-r border-zinc-800/80 h-full overflow-y-auto select-none text-zinc-300">
      {/* Console Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
            <Sliders size={13} />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-zinc-100 tracking-tight">Configuration</h2>
            <p className="text-[10px] text-zinc-500 font-mono">Synchronous Protocol Model</p>
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={loading}
          title="Reset Simulation to Initial State (R)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border border-zinc-750 rounded-lg text-[11px] font-medium transition-all disabled:opacity-50"
        >
          <RotateCcw size={12} className={loading ? 'animate-spin text-zinc-400' : 'text-zinc-400'} />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Algorithm Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>Target Algorithm</span>
          <span className="text-[10px] text-zinc-500 font-mono">Ch. 5</span>
        </label>
        <div className="relative">
          <select
            value={selectedAlg}
            onChange={(e) => onSelectAlg(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-zinc-100 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors cursor-pointer appearance-none pr-8"
          >
            {algList.map((alg) => (
              <option key={alg.name} value={alg.name} className="bg-zinc-950 text-zinc-100">
                {alg.name} &bull; {alg.topology}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 2. Algorithm Specification Surface */}
      <div className="rounded-xl p-3 bg-zinc-900/50 border border-zinc-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Cpu size={13} className="text-zinc-400" />
            {currentAlg.title || currentAlg.name}
          </span>
          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-semibold bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
            {currentAlg.topology}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          {currentAlg.summary || currentAlg.description}
        </p>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
          <span className="text-zinc-500 font-medium">Asymptotic Bound:</span>
          <span className="font-mono text-emerald-400 font-medium text-xs">
            {currentAlg.complexity}
          </span>
        </div>
      </div>

      {/* 3. Network Size (n) Slider */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/70">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[10.5px]">
            Network Size (n)
          </span>
          <span className="px-2 py-0.5 bg-zinc-800/90 border border-zinc-700 text-zinc-200 font-mono font-medium rounded text-xs">
            {nodeCount} Nodes
          </span>
        </div>
        <input
          type="range"
          min="3"
          max="24"
          value={nodeCount}
          onChange={(e) => onChangeNodeCount(parseInt(e.target.value))}
          className="w-full accent-zinc-200 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9.5px] text-zinc-500 font-mono">
          <span>n = 3 (Min)</span>
          <span>12</span>
          <span>n = 24 (Max)</span>
        </div>
      </div>

      {/* 4. ID Distribution Segmented Control */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
          Node ID Assignment
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-lg">
          {['Sequential', 'Shuffled'].map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeIdMode(mode)}
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all text-center ${
                idMode === mode
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Graph Topology (For General Graphs) */}
      {currentAlg.topology === 'general' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <GitFork size={12} className="text-zinc-400" />
            Graph Topology
          </label>
          <div className="relative">
            <select
              value={topology}
              onChange={(e) => onChangeTopology(e.target.value)}
              className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-zinc-100 rounded-lg px-3 py-2 text-xs font-medium outline-none cursor-pointer appearance-none pr-8"
            >
              {['Path', 'Cycle', 'Random connected', 'Grid-like'].map((t) => (
                <option key={t} value={t} className="bg-zinc-950 text-zinc-100">
                  {t}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      )}

      {/* 6. Random Seed */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>RNG Seed</span>
          <span className="text-[10px] text-zinc-500 font-mono">Deterministic</span>
        </label>
        <input
          type="number"
          value={seed}
          onChange={(e) => onChangeSeed(parseInt(e.target.value) || 0)}
          className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-zinc-100 rounded-lg px-3 py-1.5 text-xs font-mono font-medium outline-none"
        />
      </div>

      {/* 7. Collapsible Protocol Invariants */}
      <div className="mt-1 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
        <button
          onClick={() => setShowTheory(!showTheory)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-left text-xs font-medium text-zinc-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-1.5 text-zinc-300">
            <BookOpen size={13} className="text-zinc-400" />
            <span>Protocol Formalisms</span>
          </div>
          {showTheory ? <ChevronDown size={14} className="text-zinc-500" /> : <ChevronRight size={14} className="text-zinc-500" />}
        </button>

        {showTheory && currentAlg.steps && (
          <div className="p-3 border-t border-zinc-800/80 flex flex-col gap-2 text-xs">
            {currentAlg.steps.map((st, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-zinc-950/80 rounded-lg border border-zinc-800/80 flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[9px] font-medium">
                    {st.tag || `STEP ${st.step_number}`}
                  </span>
                  <span className="font-semibold text-zinc-200 text-xs">
                    {st.title}
                  </span>
                </div>
                <div
                  className="text-zinc-400 text-[11px] leading-relaxed mt-0.5"
                  dangerouslySetInnerHTML={{ __html: st.content }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
