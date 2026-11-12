import React from 'react';
import { X, Layers } from 'lucide-react';

export default function NodeInspector({
  nodeId,
  graph,
  currentRoundData,
  allRounds = [],
  onClose,
  isDark = true
}) {
  if (nodeId === null || nodeId === undefined) return null;

  const nodeObj = graph?.nodes?.find((n) => n.node_id === nodeId);
  const nodeState = currentRoundData?.nodes?.[nodeId] || {};
  const isLeader = currentRoundData?.leaders?.includes(nodeId) || nodeState.status === 'elected';

  // Gather all historical events involving this node
  const nodeEvents = [];
  allRounds.forEach((r) => {
    (r.events || []).forEach((ev) => {
      if (ev.src === nodeId || ev.dst === nodeId) {
        nodeEvents.push({ ...ev, roundNum: r.round });
      }
    });
  });

  return (
    <div
      className={`fixed inset-y-0 right-0 w-88 md:w-96 backdrop-blur-md border-l shadow-2xl z-50 flex flex-col p-4.5 select-none transition-colors duration-200 ${
        isDark
          ? 'bg-[#0e0e11]/95 border-zinc-800 text-zinc-300'
          : 'bg-white/95 border-slate-200 text-slate-700'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between pb-3.5 border-b ${
          isDark ? 'border-zinc-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
              isLeader
                ? isDark
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-400'
                : isDark
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'bg-slate-100 text-slate-800 border border-slate-300'
            }`}
          >
            {nodeObj?.id_value}
          </div>
          <div>
            <div className={`font-semibold text-xs font-mono ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              Node {nodeId}{' '}
              <span className={`font-sans font-normal ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                (ID: {nodeObj?.id_value})
              </span>
            </div>
            <div className={`text-[10.5px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Status:{' '}
              <span
                className={`font-semibold uppercase ${
                  isLeader
                    ? isDark
                      ? 'text-emerald-400'
                      : 'text-emerald-600'
                    : isDark
                    ? 'text-zinc-300'
                    : 'text-slate-700'
                }`}
              >
                {nodeState.status || 'unknown'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`p-1 rounded transition-colors ${
            isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-3.5 flex flex-col gap-3 text-xs">
        {/* Status Card */}
        <div
          className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className={`font-semibold uppercase tracking-wider text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Node Telemetry
          </div>
          <div className={`grid grid-cols-2 gap-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            <div>
              <span className={`block text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Network Index:</span>
              <span className="font-mono font-medium text-xs">Node {nodeId}</span>
            </div>
            <div>
              <span className={`block text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Assigned ID:</span>
              <span className={`font-mono font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                {nodeObj?.id_value}
              </span>
            </div>
          </div>
        </div>

        {/* Local Variables */}
        <div
          className={`p-3 rounded-xl border flex flex-col gap-2 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div
            className={`font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5 ${
              isDark ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            <Layers size={12} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
            <span>Local State Variables</span>
          </div>
          {nodeState.state && Object.keys(nodeState.state).length > 0 ? (
            <div className="flex flex-col gap-1 font-mono text-[11px]">
              {Object.entries(nodeState.state).map(([k, v]) => (
                <div
                  key={k}
                  className={`flex justify-between py-1 border-b ${
                    isDark ? 'border-zinc-800/60' : 'border-slate-200'
                  }`}
                >
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>{k}:</span>
                  <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              No custom local variables set for this round.
            </div>
          )}
        </div>

        {/* Historical Events for this node */}
        <div className="flex-1 flex flex-col gap-2">
          <div
            className={`font-semibold uppercase tracking-wider text-[10px] flex items-center justify-between ${
              isDark ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            <span>Transmission History</span>
            <span className={`font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              {nodeEvents.length} events
            </span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {nodeEvents.length === 0 ? (
              <div className={`text-[11px] py-4 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                No events recorded for this node yet.
              </div>
            ) : (
              nodeEvents.map((ev, idx) => {
                const isSent = ev.src === nodeId;
                return (
                  <div
                    key={idx}
                    className={`p-2 border rounded-lg text-[11px] font-mono flex flex-col gap-0.5 ${
                      isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={
                          isSent
                            ? isDark
                              ? 'text-zinc-300 font-semibold'
                              : 'text-slate-900 font-semibold'
                            : isDark
                            ? 'text-zinc-400'
                            : 'text-slate-600'
                        }
                      >
                        {isSent ? 'Sent' : 'Received'} ({ev.event})
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>R{ev.roundNum}</span>
                    </div>
                    <div className={`font-sans text-[10.5px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      {ev.details}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
