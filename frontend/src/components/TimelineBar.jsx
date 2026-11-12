import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  FastForward
} from 'lucide-react';

export default function TimelineBar({
  currentRound,
  totalRounds,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onRestart,
  onFastForward,
  onSeek,
  speed,
  onChangeSpeed,
  messageCount = 0,
  isFinished = false,
  isMotionPaused = false,
  onToggleFreezeMotion,
  packetProgress = 0.5,
  onSeekPacketProgress,
  isDark = true
}) {
  const speeds = [0.5, 1, 2, 4];

  return (
    <div
      className={`w-full px-4 py-2.5 border-t flex items-center justify-between gap-4 select-none text-xs transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] border-white/[0.08]' : 'bg-white border-slate-200'
      }`}
    >
      {/* 1. Left: Playback Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onRestart}
          title="Restart Simulation (R)"
          className={`surface-button p-1.5 rounded-lg ${
            isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <RotateCcw size={14} />
        </button>

        <button
          onClick={onStepBackward}
          disabled={currentRound <= 0 || isPlaying}
          title="Step Backward (Left Arrow)"
          className={`surface-button p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed ${
            isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <SkipBack size={14} />
        </button>

        {/* Primary Play/Pause Button */}
        <button
          onClick={onTogglePlay}
          disabled={isFinished && currentRound >= totalRounds}
          title="Play / Pause (Space)"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            isPlaying
              ? isDark
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'bg-amber-50 text-amber-700 border border-amber-300'
              : isDark
              ? 'bg-white text-zinc-950 hover:bg-zinc-200 font-semibold shadow-sm disabled:opacity-25 disabled:cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800 font-semibold shadow-sm disabled:opacity-25 disabled:cursor-not-allowed'
          }`}
        >
          {isPlaying ? <Pause size={13} className="fill-current" /> : <Play size={13} className="fill-current ml-0.5" />}
          <span className="text-xs">{isPlaying ? 'Pause' : 'Run'}</span>
          <span className="text-[10px] opacity-60 font-mono-code ml-0.5">[Space]</span>
        </button>

        <button
          onClick={onStepForward}
          disabled={currentRound >= totalRounds || isPlaying}
          title="Step Forward (Right Arrow)"
          className={`surface-button p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed ${
            isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <SkipForward size={14} />
        </button>

        <button
          onClick={onFastForward}
          disabled={currentRound >= totalRounds}
          title="Fast-Forward to Completion"
          className={`surface-button p-1.5 rounded-lg disabled:opacity-25 disabled:cursor-not-allowed ${
            isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          <FastForward size={14} />
        </button>
      </div>

      {/* 2. Center: Round Scrubber */}
      <div className="flex-1 max-w-xl flex items-center gap-3">
        <div className={`font-mono-code text-[11px] font-medium shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>R{currentRound}</span>
          <span className={`mx-1 ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>/</span>
          <span>R{totalRounds}</span>
        </div>

        <input
          type="range"
          min="0"
          max={Math.max(totalRounds, 1)}
          value={currentRound}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
            isDark ? 'accent-zinc-200 bg-zinc-800' : 'accent-sky-600 bg-slate-200'
          }`}
        />

        <div className={`hidden md:flex items-center gap-1 text-[11px] font-mono-code shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Messages:</span>
          <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{messageCount}</span>
        </div>
      </div>

      {/* 3. Right: Mid-Air Freeze & Flight Slider + Speed */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Packet Motion Toggle & Scrubber */}
        <div
          className={`flex items-center gap-2 border px-2.5 py-1 rounded-lg ${
            isDark ? 'bg-zinc-900/60 border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={onToggleFreezeMotion}
            title="Freeze/Resume flying messages (F)"
            className={`flex items-center gap-1 text-[11px] font-mono-code font-medium transition-colors ${
              isMotionPaused
                ? isDark
                  ? 'text-amber-400 font-semibold'
                  : 'text-amber-600 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isMotionPaused ? <Play size={10} className="fill-current" /> : <Pause size={10} className="fill-current" />}
            <span>{isMotionPaused ? 'Resume' : 'Freeze'}</span>
          </button>

          <span className={`h-3 w-px ${isDark ? 'bg-zinc-800' : 'bg-slate-300'}`}></span>

          <span className={`text-[10.5px] font-mono-code ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            {Math.round(packetProgress * 100)}%
          </span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={packetProgress}
            onChange={(e) => onSeekPacketProgress(parseFloat(e.target.value))}
            className={`w-16 sm:w-20 h-1 rounded appearance-none cursor-pointer ${
              isDark ? 'accent-amber-400 bg-zinc-800' : 'accent-amber-600 bg-slate-300'
            }`}
          />
        </div>

        {/* Speed Switcher */}
        <div
          className={`flex items-center gap-0.5 border p-0.5 rounded-lg font-mono-code text-[10.5px] ${
            isDark ? 'bg-zinc-900/60 border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                speed === s
                  ? isDark
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200'
                  : isDark
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
