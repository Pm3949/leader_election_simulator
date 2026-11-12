import React, { useState } from 'react';
import {
  ListTree,
  TableProperties,
  ScrollText,
  Send,
  Download,
  ArrowRight
} from 'lucide-react';

export default function StorylineDrawer({
  currentRoundData,
  allEvents = [],
  nodes = [],
  onSelectNode,
  isDark = true
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

  const tabClass = (key) =>
    `flex items-center gap-1.5 py-3 px-2.5 text-xs font-medium border-b-2 transition-all ${
      activeTab === key
        ? isDark
          ? 'border-sky-400 text-zinc-100 bg-zinc-900/40'
          : 'border-sky-600 text-slate-900 bg-white'
        : isDark
        ? 'border-transparent text-zinc-400 hover:text-zinc-200'
        : 'border-transparent text-slate-500 hover:text-slate-900'
    }`;

  return (
    <div
      className={`flex flex-col h-full border-l select-none transition-colors duration-200 ${
        isDark
          ? 'bg-[#0e0e11] border-zinc-800/80 text-zinc-300'
          : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      {/* Tab Navigation Header */}
      <div
        className={`flex items-center justify-between border-b px-3 shrink-0 ${
          isDark ? 'border-zinc-800 bg-[#0a0a0d]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-0.5">
          <button onClick={() => setActiveTab('in_flight')} className={tabClass('in_flight')}>
            <Send
              size={13}
              className={
                activeTab === 'in_flight'
                  ? isDark
                    ? 'text-sky-400'
                    : 'text-sky-600'
                  : isDark
                  ? 'text-zinc-500'
                  : 'text-slate-400'
              }
            />
            <span>In Flight</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {inFlight.length}
            </span>
          </button>

          <button onClick={() => setActiveTab('storyline')} className={tabClass('storyline')}>
            <ListTree
              size={13}
              className={
                activeTab === 'storyline'
                  ? isDark
                    ? 'text-sky-400'
                    : 'text-sky-600'
                  : isDark
                  ? 'text-zinc-500'
                  : 'text-slate-400'
              }
            />
            <span>Trace</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {storylines.length}
            </span>
          </button>

          <button onClick={() => setActiveTab('nodes')} className={tabClass('nodes')}>
            <TableProperties
              size={13}
              className={
                activeTab === 'nodes'
                  ? isDark
                    ? 'text-sky-400'
                    : 'text-sky-600'
                  : isDark
                  ? 'text-zinc-500'
                  : 'text-slate-400'
              }
            />
            <span>Nodes</span>
          </button>

          <button onClick={() => setActiveTab('events')} className={tabClass('events')}>
            <ScrollText
              size={13}
              className={
                activeTab === 'events'
                  ? isDark
                    ? 'text-sky-400'
                    : 'text-sky-600'
                  : isDark
                  ? 'text-zinc-500'
                  : 'text-slate-400'
              }
            />
            <span>Audit</span>
          </button>
        </div>

        {activeTab === 'events' && (
          <button
            onClick={exportCsv}
            title="Export CSV Audit Trail"
            className={`flex items-center gap-1 text-[10px] px-2 py-1 border rounded transition-colors font-mono ${
              isDark
                ? 'text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                : 'text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border-slate-300'
            }`}
          >
            <Download size={11} />
            <span>CSV</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {/* 1. IN-FLIGHT MESSAGES TAB */}
        {activeTab === 'in_flight' && (
          <div className="flex flex-col gap-2.5">
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center justify-between ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              <span>Delivery Queued for Round {currentRoundData ? currentRoundData.round + 1 : 1}</span>
              <span className={`font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {inFlight.length} In-Flight
              </span>
            </div>

            {inFlight.length === 0 ? (
              <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                No active packets queued for transmission in this synchronous round.
              </div>
            ) : (
              inFlight.map((msg, idx) => {
                const srcNode = nodes.find((n) => n.node_id === msg.src);
                const dstNode = nodes.find((n) => n.node_id === msg.dst);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition-colors ${
                      isDark
                        ? 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Top Row: Path Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                              : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        >
                          n{msg.src}{' '}
                          <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            (ID:{srcNode?.id_value ?? '?'})
                          </span>
                        </span>
                        <ArrowRight size={13} className={isDark ? 'text-zinc-500 shrink-0' : 'text-slate-400 shrink-0'} />
                        <span
                          className={`px-1.5 py-0.5 rounded border ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                              : 'bg-white text-slate-900 border-slate-300'
                          }`}
                        >
                          n{msg.dst}{' '}
                          <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                            (ID:{dstNode?.id_value ?? '?'})
                          </span>
                        </span>
                      </div>

                      <span
                        className="px-2 py-0.5 rounded text-[9.5px] font-mono font-medium uppercase tracking-wider border"
                        style={{
                          backgroundColor: `${msg.color || '#38bdf8'}18`,
                          color: msg.color || '#0284c7',
                          borderColor: `${msg.color || '#38bdf8'}40`
                        }}
                      >
                        {msg.kind || 'TOKEN'}
                      </span>
                    </div>

                    {/* Payload Details */}
                    <div
                      className={`flex items-center justify-between text-[11px] pt-1.5 border-t font-mono ${
                        isDark ? 'border-zinc-800/60' : 'border-slate-200'
                      }`}
                    >
                      <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Payload:</span>
                      <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{msg.label}</span>
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
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center justify-between ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              <span>Round {currentRoundData?.round} Execution Trace</span>
              <span className={`font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {storylines.length} Actions
              </span>
            </div>

            {storylines.length === 0 ? (
              <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                No state transition events logged for this round.
              </div>
            ) : (
              storylines.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-colors ${
                    isDark
                      ? 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                      {item.title}
                    </span>
                    <span
                      className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-semibold border"
                      style={{
                        backgroundColor: `${item.badge_color || '#38bdf8'}18`,
                        color: item.badge_color || '#0284c7',
                        borderColor: `${item.badge_color || '#38bdf8'}40`,
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div className={`text-[11.5px] leading-relaxed font-sans ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
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
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center justify-between ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              <span>Node States in Round {currentRoundData?.round}</span>
              <span className={`font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{nodes.length} Nodes</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {nodes.map((node) => {
                const st = nodeStates[node.node_id] || { status: 'active', id: node.id_value, state: {} };
                const isLeader = st.status === 'elected';

                return (
                  <div
                    key={node.node_id}
                    onClick={() => onSelectNode(node.node_id)}
                    className={`p-2.5 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
                      isDark
                        ? 'bg-zinc-900/60 hover:bg-zinc-800/60 border-zinc-800'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                          isLeader
                            ? isDark
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-400'
                            : st.status === 'candidate'
                            ? isDark
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-amber-50 text-amber-700 border border-amber-400'
                            : st.status === 'non-elected'
                            ? isDark
                              ? 'bg-zinc-800 text-zinc-500'
                              : 'bg-slate-200 text-slate-500'
                            : isDark
                            ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                            : 'bg-white text-slate-800 border border-slate-300'
                        }`}
                      >
                        {st.id}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold font-mono ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                          n{node.node_id}{' '}
                          <span className={`font-sans font-normal ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                            (ID: {st.id})
                          </span>
                        </div>
                        <div className={`text-[10px] font-mono truncate max-w-[170px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
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
                          ? isDark
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : st.status === 'candidate'
                          ? isDark
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-amber-50 text-amber-700 border border-amber-300'
                          : st.status === 'non-elected'
                          ? isDark
                            ? 'bg-zinc-800/60 text-zinc-500'
                            : 'bg-slate-200 text-slate-500'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          : 'bg-white text-slate-700 border border-slate-300'
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
            <div
              className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 flex items-center justify-between ${
                isDark ? 'text-zinc-500' : 'text-slate-500'
              }`}
            >
              <span>Events in Round {currentRoundData?.round}</span>
              <span className={`font-mono ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                {roundEvents.length} Events
              </span>
            </div>

            {roundEvents.length === 0 ? (
              <div className={`text-center py-12 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                No events in round {currentRoundData?.round}.
              </div>
            ) : (
              roundEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className={`p-2 border rounded-lg text-xs font-mono flex flex-col gap-1 ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{ev.event}</span>
                    <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>R{ev.round}</span>
                  </div>
                  <div className={`text-[11px] font-sans ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
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
