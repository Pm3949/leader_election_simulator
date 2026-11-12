import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sliders,
  GitFork,
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
  loading,
  isDark = true
}) {
  const [showTheory, setShowTheory] = useState(false);
  const algList = Array.isArray(algorithms) ? algorithms : [];
  const currentAlg = algList.find((a) => a.name === selectedAlg) || algList[0] || {};

  return (
    <div
      className={`flex flex-col gap-4 p-4.5 border-r h-full overflow-y-auto select-none transition-colors duration-200 ${
        isDark
          ? 'bg-[#0e0e11] border-zinc-800/80 text-zinc-300'
          : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      {/* Console Header */}
      <div
        className={`flex items-center justify-between pb-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md border flex items-center justify-center ${
              isDark
                ? 'bg-zinc-800/90 border-zinc-700/80 text-zinc-300'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <Sliders size={13} />
          </div>
          <div>
            <h2 className={`text-xs font-semibold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              Configuration
            </h2>
            <p className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Synchronous Protocol Model
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          disabled={loading}
          title="Reset Simulation to Initial State (R)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-[11px] font-medium transition-all disabled:opacity-50 ${
            isDark
              ? 'bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 border-zinc-700'
              : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 border-slate-300'
          }`}
        >
          <RotateCcw
            size={12}
            className={loading ? 'animate-spin text-sky-500' : isDark ? 'text-zinc-400' : 'text-slate-600'}
          />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. Algorithm Selection */}
      <div className="flex flex-col gap-1.5">
        <label
          className={`text-[10.5px] font-semibold uppercase tracking-wider flex items-center justify-between ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <span>Target Algorithm</span>
        </label>
        <div className="relative">
          <select
            value={selectedAlg}
            onChange={(e) => onSelectAlg(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors cursor-pointer appearance-none pr-8 ${
              isDark
                ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-zinc-100'
                : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-sky-500 text-slate-900'
            }`}
          >
            {algList.map((alg) => (
              <option
                key={alg.name}
                value={alg.name}
                className={isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-900'}
              >
                {alg.name} &bull; {alg.topology}
              </option>
            ))}
          </select>
          <div
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
              isDark ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 2. Algorithm Specification Surface */}
      <div
        className={`rounded-xl p-3 border flex flex-col gap-2 ${
          isDark ? 'bg-zinc-900/50 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-semibold flex items-center gap-1.5 ${
              isDark ? 'text-zinc-200' : 'text-slate-900'
            }`}
          >
            <Cpu size={13} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
            {currentAlg.title || currentAlg.name}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-semibold border ${
              isDark
                ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {currentAlg.topology}
          </span>
        </div>

        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          {currentAlg.summary || currentAlg.description}
        </p>

        <div
          className={`pt-2 border-t flex items-center justify-between text-[11px] gap-2 ${
            isDark ? 'border-zinc-800/80' : 'border-slate-200'
          }`}
        >
          <span className={`font-medium shrink-0 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Asymptotic Bound:
          </span>
          <span className={`font-mono font-medium text-xs text-right ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {currentAlg.complexity}
          </span>
        </div>
      </div>

      {/* 3. Network Size (n) Slider */}
      <div
        className={`flex flex-col gap-2 p-3 rounded-xl border ${
          isDark ? 'bg-zinc-900/40 border-zinc-800/70' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <span
            className={`font-semibold uppercase tracking-wider text-[10.5px] ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}
          >
            Network Size (n)
          </span>
          <span
            className={`px-2 py-0.5 border font-mono font-medium rounded text-xs ${
              isDark
                ? 'bg-zinc-800/90 border-zinc-700 text-zinc-200'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            {nodeCount} Nodes
          </span>
        </div>
        <input
          type="range"
          min="3"
          max="24"
          value={nodeCount}
          onChange={(e) => onChangeNodeCount(parseInt(e.target.value))}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
            isDark ? 'accent-zinc-200 bg-zinc-800' : 'accent-sky-600 bg-slate-200'
          }`}
        />
        <div className={`flex justify-between text-[9.5px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
          <span>n = 3 (Min)</span>
          <span>12</span>
          <span>n = 24 (Max)</span>
        </div>
      </div>

      {/* 4. ID Distribution Segmented Control */}
      <div className="flex flex-col gap-1.5">
        <label className={`text-[10.5px] font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Node ID Assignment
        </label>
        <div
          className={`grid grid-cols-2 gap-1.5 p-1 border rounded-lg ${
            isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {['Sequential', 'Shuffled'].map((mode) => (
            <button
              key={mode}
              onClick={() => onChangeIdMode(mode)}
              className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all text-center ${
                idMode === mode
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                    : 'bg-white text-slate-900 shadow-sm border border-slate-300'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-slate-500 hover:text-slate-900'
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
          <label
            className={`text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}
          >
            <GitFork size={12} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
            Graph Topology
          </label>
          <div className="relative">
            <select
              value={topology}
              onChange={(e) => onChangeTopology(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs font-medium outline-none cursor-pointer appearance-none pr-8 ${
                isDark
                  ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-zinc-100'
                  : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-sky-500 text-slate-900'
              }`}
            >
              {[
                { value: 'Path', label: 'Path (Linear Chain)' },
                { value: 'Cycle', label: 'Cycle (Ring)' },
                { value: 'Binary Tree', label: 'Binary Tree (Pyramid)' },
                { value: 'Grid-like', label: 'Grid-like (2D Lattice)' },
                { value: 'Two Clusters', label: 'Two Clusters (Bridge)' },
                { value: 'Random connected', label: 'Random Tree (Organic)' },
              ].map((t) => (
                <option
                  key={t.value}
                  value={t.value}
                  className={isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-slate-900'}
                >
                  {t.label}
                </option>
              ))}
            </select>
            <div
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      )}

      {/* 6. Random Seed */}
      <div className="flex flex-col gap-1.5">
        <label
          className={`text-[10.5px] font-semibold uppercase tracking-wider flex items-center justify-between ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <span>RNG Seed</span>
          <span className={`text-[10px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Deterministic</span>
        </label>
        <input
          type="number"
          value={seed}
          onChange={(e) => onChangeSeed(parseInt(e.target.value) || 0)}
          className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono font-medium outline-none ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 text-zinc-100'
              : 'bg-slate-50 border-slate-300 hover:border-slate-400 focus:border-sky-500 text-slate-900'
          }`}
        />
      </div>

      {/* 7. Collapsible Protocol Invariants */}
      <div
        className={`mt-1 border rounded-xl overflow-hidden ${
          isDark ? 'border-zinc-800 bg-zinc-900/40' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <button
          onClick={() => setShowTheory(!showTheory)}
          className={`w-full px-3 py-2.5 flex items-center justify-between text-left text-xs font-medium transition-colors ${
            isDark ? 'text-zinc-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <div className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            <BookOpen size={13} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
            <span>Protocol Formalisms</span>
          </div>
          {showTheory ? (
            <ChevronDown size={14} className={isDark ? 'text-zinc-500' : 'text-slate-400'} />
          ) : (
            <ChevronRight size={14} className={isDark ? 'text-zinc-500' : 'text-slate-400'} />
          )}
        </button>

        {showTheory && currentAlg.steps && (
          <div
            className={`p-3 border-t flex flex-col gap-2 text-xs ${
              isDark ? 'border-zinc-800/80' : 'border-slate-200'
            }`}
          >
            {currentAlg.steps.map((st, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                  isDark ? 'bg-zinc-950/80 border-zinc-800/80' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-medium ${
                      isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {st.tag || `STEP ${st.step_number}`}
                  </span>
                  <span className={`font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    {st.title}
                  </span>
                </div>
                <div
                  className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}
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
