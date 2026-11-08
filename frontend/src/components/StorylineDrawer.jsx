import React, { useState } from 'react';
import {
  ListTree,
  TableProperties,
  ScrollText,
  Send,
  Download,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function StorylineDrawer({
  currentRoundData,
  allEvents = [],
  nodes = [],
  onSelectNode
}) {
  const [activeTab, setActiveTab] = useState('in_flight');

  const storylines = currentRoundData?.storylines || [];
  const nodeStates = currentRoundData?.nodes || {};
  const inFlight = currentRoundData?.in_flight || [];
  const roundEvents = currentRoundData?.events || [];

  const exportCsv = () => {
    if (!allEvents.length) return;
    const header = ['Round', 'Event', 'Source', 'Destination', 'Kind', 'Details'];
    const rows = allEvents.map((e) => [
      e.round,
      `"${e.event}"`,
      e.src ?? '',
      e.dst ?? '',
      `"${e.kind}"`,
      `"${(e.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leader_election_events.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e11] border-l border-zinc-800/80 select-none text-zinc-300">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 bg-[#0a0a0d] shrink-0">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setActiveTab('in_flight')}
            className={`flex items-center gap-1.5 py-3 px-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'in_flight'
                ? 'border-sky-400 text-zinc-100 bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Send size={13} className={activeTab === 'in_flight' ? 'text-sky-400' : 'text-zinc-500'} />
            <span>In Flight</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 font-mono">
              {inFlight.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('storyline')}
            className={`flex items-center gap-1.5 py-3 px-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'storyline'
                ? 'border-sky-400 text-zinc-100 bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListTree size={13} className={activeTab === 'storyline' ? 'text-sky-400' : 'text-zinc-500'} />
            <span>Trace</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400 font-mono">
              {storylines.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-1.5 py-3 px-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'nodes'
                ? 'border-sky-400 text-zinc-100 bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TableProperties size={13} className={activeTab === 'nodes' ? 'text-sky-400' : 'text-zinc-500'} />
            <span>Nodes</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-1.5 py-3 px-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'events'
                ? 'border-sky-400 text-zinc-100 bg-zinc-900/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ScrollText size={13} className={activeTab === 'events' ? 'text-sky-400' : 'text-zinc-500'} />
            <span>Audit</span>
          </button>
        </div>

        {activeTab === 'events' && (
          <button
            onClick={exportCsv}
            title="Export CSV Audit Trail"
            className="flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors font-mono"
          >
            <Download size={11} />
            <span>CSV</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {/* 1. IN-FLIGHT MESSAGES TAB (Clear where-to-where telemetry) */}
        {activeTab === 'in_flight' && (
          <div className="flex flex-col gap-2.5">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Delivery Queued for Round {currentRoundData ? currentRoundData.round + 1 : 1}</span>
              <span className="font-mono text-zinc-400">{inFlight.length} In-Flight</span>
            </div>

            {inFlight.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No active packets queued for transmission in this synchronous round.
              </div>
            ) : (
              inFlight.map((msg, idx) => {
                const srcNode = nodes.find((n) => n.node_id === msg.src);
                const dstNode = nodes.find((n) => n.node_id === msg.dst);

                return (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800 flex flex-col gap-2 hover:border-zinc-700 transition-colors"
                  >
                    {/* Top Row: Path Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                          n{msg.src} <span className="text-[10px] text-zinc-400">(ID:{srcNode?.id_value ?? '?'})</span>
                        </span>
                        <ArrowRight size={13} className="text-zinc-500 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                          n{msg.dst} <span className="text-[10px] text-zinc-400">(ID:{dstNode?.id_value ?? '?'})</span>
                        </span>
                      </div>

                      <span
                        className="px-2 py-0.5 rounded text-[9.5px] font-mono font-medium uppercase tracking-wider border"
                        style={{
                          backgroundColor: `${msg.color || '#38bdf8'}15`,
                          color: msg.color || '#38bdf8',
                          borderColor: `${msg.color || '#38bdf8'}30`
                        }}
                      >
                        {msg.kind || 'TOKEN'}
                      </span>
                    </div>

                    {/* Payload Details */}
                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-zinc-800/60 font-mono">
                      <span className="text-zinc-400">Payload:</span>
                      <span className="text-zinc-200 font-semibold">{msg.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 2. STORYLINE TAB */}
        {activeTab === 'storyline' && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Round {currentRoundData?.round} Execution Trace</span>
              <span className="font-mono text-zinc-400">{storylines.length} Actions</span>
            </div>

            {storylines.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No state transition events logged for this round.
              </div>
            ) : (
              storylines.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 flex flex-col gap-1.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-zinc-200">
                      {item.title}
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-semibold border"
                      style={{
                        backgroundColor: `${item.badge_color || '#38bdf8'}15`,
                        color: item.badge_color || '#38bdf8',
                        borderColor: `${item.badge_color || '#38bdf8'}30`,
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-zinc-400 leading-relaxed font-sans">
                    {item.detail}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. NODES TAB */}
        {activeTab === 'nodes' && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Node States in Round {currentRoundData?.round}</span>
              <span className="font-mono text-zinc-400">{nodes.length} Nodes</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {nodes.map((node) => {
                const st = nodeStates[node.node_id] || { status: 'active', id: node.id_value, state: {} };
                const isLeader = st.status === 'elected';

                return (
                  <div
                    key={node.node_id}
                    onClick={() => onSelectNode(node.node_id)}
                    className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800 rounded-lg cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                          isLeader
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                            : st.status === 'candidate'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : st.status === 'non-elected'
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        {st.id}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200 font-mono">
                          n{node.node_id} <span className="text-zinc-500 font-sans font-normal">(ID: {st.id})</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[170px]">
                          {Object.keys(st.state || {}).length > 0
                            ? Object.entries(st.state)
                                .map(([k, v]) => `${k}:${v}`)
                                .join(' ')
                            : 'idle'}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-medium uppercase ${
                        isLeader
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : st.status === 'candidate'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : st.status === 'non-elected'
                          ? 'bg-zinc-800/60 text-zinc-500'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. EVENTS AUDIT TAB */}
        {activeTab === 'events' && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5 flex items-center justify-between">
              <span>Events in Round {currentRoundData?.round}</span>
              <span className="font-mono text-zinc-400">{roundEvents.length} Events</span>
            </div>

            {roundEvents.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                No events in round {currentRoundData?.round}.
              </div>
            ) : (
              roundEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-zinc-900/60 border border-zinc-800 rounded-lg text-xs font-mono flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200 font-semibold">{ev.event}</span>
                    <span className="text-[10px] text-zinc-500">R{ev.round}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-sans">
                    {ev.src !== null && ev.dst !== null
                      ? `n${ev.src} → n${ev.dst}: `
                      : ev.src !== null
                      ? `n${ev.src}: `
                      : ''}
                    {ev.details}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
