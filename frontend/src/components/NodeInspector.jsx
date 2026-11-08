import React from 'react';
import { X, Layers, ArrowRight } from 'lucide-react';

export default function NodeInspector({
  nodeId,
  graph,
  currentRoundData,
  allRounds = [],
  onClose
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
    <div className="fixed inset-y-0 right-0 w-88 md:w-96 bg-[#0e0e11]/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl z-50 flex flex-col p-4.5 select-none text-zinc-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
              isLeader
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                : 'bg-zinc-800 text-zinc-200 border border-zinc-750'
            }`}
          >
            {nodeObj?.id_value}
          </div>
          <div>
            <div className="font-semibold text-xs text-zinc-100 font-mono">
              Node {nodeId} <span className="text-zinc-500 font-sans font-normal">(ID: {nodeObj?.id_value})</span>
            </div>
            <div className="text-[10.5px] text-zinc-500 font-mono">
              Status:{' '}
              <span className={`font-semibold uppercase ${isLeader ? 'text-emerald-400' : 'text-zinc-300'}`}>
                {nodeState.status || 'unknown'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-3.5 flex flex-col gap-3 text-xs">
        {/* Status Card */}
        <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col gap-1.5">
          <div className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
            Node Telemetry
          </div>
          <div className="grid grid-cols-2 gap-2 text-zinc-300">
            <div>
              <span className="text-zinc-500 block text-[10px]">Network Index:</span>
              <span className="font-mono font-medium text-xs">Node {nodeId}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Assigned ID:</span>
              <span className="font-mono font-semibold text-zinc-200 text-xs">{nodeObj?.id_value}</span>
            </div>
          </div>
        </div>

        {/* Local Variables */}
        <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 flex flex-col gap-2">
          <div className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
            <Layers size={12} className="text-zinc-400" />
            <span>Local State Variables</span>
          </div>
          {nodeState.state && Object.keys(nodeState.state).length > 0 ? (
            <div className="flex flex-col gap-1 font-mono text-[11px]">
              {Object.entries(nodeState.state).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">{k}:</span>
                  <span className="text-zinc-200 font-medium">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-500 text-[11px]">
              No custom local variables set for this round.
            </div>
          )}
        </div>

        {/* Historical Events for this node */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px] flex items-center justify-between">
            <span>Transmission History</span>
            <span className="font-mono text-zinc-400">{nodeEvents.length} events</span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {nodeEvents.length === 0 ? (
              <div className="text-zinc-500 text-[11px] py-4 text-center">
                No events recorded for this node yet.
              </div>
            ) : (
              nodeEvents.map((ev, idx) => {
                const isSent = ev.src === nodeId;
                return (
                  <div
                    key={idx}
                    className="p-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-[11px] font-mono flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={isSent ? 'text-zinc-300 font-semibold' : 'text-zinc-400'}>
                        {isSent ? 'Sent' : 'Received'} ({ev.event})
                      </span>
                      <span className="text-[10px] text-zinc-500">R{ev.roundNum}</span>
                    </div>
                    <div className="text-zinc-400 font-sans text-[10.5px]">
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
