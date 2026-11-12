import React, { useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Cpu,
  Zap
} from 'lucide-react';

export default function ComplexityDashboard({
  simData,
  selectedAlg,
  nodeCount,
  isDark = true
}) {
  const n = nodeCount || 8;
  const totalMessages = simData?.total_messages ?? 0;
  const totalRounds = simData?.total_rounds ?? 0;
  const rounds = simData?.rounds || [];
  const edgeCount = simData?.graph?.edges?.length || n;

  // 1. Calculate messages sent in each round
  const roundMessageSeries = useMemo(() => {
    if (!rounds.length) return [];
    const series = [];
    for (let i = 0; i < rounds.length; i++) {
      const curMsg = rounds[i].message_count || 0;
      const prevMsg = i > 0 ? (rounds[i - 1].message_count || 0) : 0;
      series.push({
        round: rounds[i].round,
        cumulative: curMsg,
        inRound: Math.max(0, curMsg - prevMsg),
      });
    }
    return series;
  }, [rounds]);

  // 2. Compute theoretical asymptotic values
  const theoreticalMetrics = useMemo(() => {
    let boundFormula = "O(n²)";
    let boundVal = n * n;
    let roundFormula = "O(n)";
    let roundVal = n;

    if (selectedAlg === 'BasicLE-Ring') {
      boundFormula = "n(n+1)/2 = O(n²)";
      boundVal = Math.round((n * (n + 1)) / 2);
      roundFormula = "n rounds";
      roundVal = n;
    } else if (selectedAlg === 'ImprovedLE-Ring') {
      boundFormula = "8 n log₂(n) = O(n log n)";
      boundVal = Math.round(8 * n * Math.log2(Math.max(n, 2)));
      roundFormula = "O(n) rounds";
      roundVal = Math.round(2 * n);
    } else if (selectedAlg === 'RandLE-Ring') {
      boundFormula = "E[M] = O(n log n)";
      boundVal = Math.round(1.5 * n * Math.log2(Math.max(n, 2)));
      roundFormula = "O(n) rounds";
      roundVal = n;
    } else if (selectedAlg === 'SimpleLE-CN') {
      boundFormula = "n(n - 1) = Θ(n²)";
      boundVal = n * (n - 1);
      roundFormula = "1 round";
      roundVal = 1;
    } else if (selectedAlg === 'RandLE-CN') {
      boundFormula = "O(√n log^(3/2) n)";
      boundVal = Math.round(4 * Math.sqrt(n) * Math.pow(Math.log2(Math.max(n, 2)), 1.5));
      roundFormula = "O(1) rounds";
      roundVal = 2;
    } else if (selectedAlg === 'BasicLE-Gen') {
      const D = Math.max(2, Math.round(Math.sqrt(n)));
      boundFormula = "O(D · |E|)";
      boundVal = D * edgeCount;
      roundFormula = "D rounds";
      roundVal = D;
    } else if (selectedAlg === 'RandLE-Gen') {
      const D = Math.max(2, Math.round(Math.sqrt(n)));
      boundFormula = "O(|E| min{log n, D})";
      boundVal = Math.round(edgeCount * Math.min(Math.log2(Math.max(n, 2)), D));
      roundFormula = "D rounds";
      roundVal = D;
    }

    const efficiency = boundVal > 0 ? ((totalMessages / boundVal) * 100).toFixed(1) : '100';

    return {
      boundFormula,
      boundVal,
      roundFormula,
      roundVal,
      efficiency,
    };
  }, [selectedAlg, n, totalMessages, edgeCount]);

  const maxInRound = useMemo(() => {
    return Math.max(1, ...roundMessageSeries.map((s) => s.inRound));
  }, [roundMessageSeries]);

  // Asymptotic Curves
  const curvePoints = useMemo(() => {
    const points = [];
    for (let i = 3; i <= 24; i += 1) {
      points.push({
        n: i,
        quadratic: i * i,
        nLogN: Math.round(i * Math.log2(i) * 2),
        subQuadratic: Math.round(4 * Math.sqrt(i) * Math.pow(Math.log2(i), 1.5)),
        linear: i * 2,
      });
    }
    return points;
  }, []);

  const maxCurveY = 24 * 24; // 576
  const graphWidth = 580;
  const graphHeight = 220;
  const graphPad = { left: 45, right: 30, top: 20, bottom: 30 };

  const scaleX = (val) =>
    graphPad.left + ((val - 3) / (24 - 3)) * (graphWidth - graphPad.left - graphPad.right);
  const scaleY = (val) =>
    graphHeight -
    graphPad.bottom -
    (Math.min(val, maxCurveY) / maxCurveY) * (graphHeight - graphPad.top - graphPad.bottom);

  const makeLinePath = (key) => {
    return curvePoints
      .map((p, idx) => {
        const x = scaleX(p.n);
        const y = scaleY(p[key]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  const statCardClass = `rounded-xl p-4 border flex flex-col gap-1.5 ${
    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
  }`;

  const iconBoxClass = `w-6 h-6 rounded border flex items-center justify-center ${
    isDark
      ? 'bg-zinc-800 border-zinc-700/80 text-zinc-300'
      : 'bg-slate-100 border-slate-200 text-slate-600'
  }`;

  const sectionCardClass = `rounded-xl p-4 border flex flex-col gap-3 ${
    isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
  }`;

  const matrixRows = [
    {
      key: 'BasicLE-Ring',
      name: 'BasicLE-Ring (LCR)',
      topology: 'Ring (Unidirectional)',
      rounds: 'O(n)',
      roundsColor: isDark ? 'text-amber-400' : 'text-amber-600',
      messages: 'O(n²) worst; O(n log n) avg',
      messagesColor: isDark ? 'text-rose-400' : 'text-rose-600',
      strategy: 'Clockwise token filtering',
    },
    {
      key: 'ImprovedLE-Ring',
      name: 'ImprovedLE-Ring (HS)',
      topology: 'Ring (Bidirectional)',
      rounds: 'O(n)',
      roundsColor: isDark ? 'text-amber-400' : 'text-amber-600',
      messages: 'O(n log n) deterministic',
      messagesColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      strategy: 'Phased 2^k doubling probes',
    },
    {
      key: 'RandLE-Ring',
      name: 'RandLE-Ring',
      topology: 'Ring (Unidirectional)',
      rounds: 'O(n)',
      roundsColor: isDark ? 'text-amber-400' : 'text-amber-600',
      messages: 'Expected O(n log n)',
      messagesColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      strategy: 'Random rank sampling',
    },
    {
      key: 'SimpleLE-CN',
      name: 'SimpleLE-CN',
      topology: 'Complete (Clique)',
      rounds: '1 round',
      roundsColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      messages: 'Θ(n²) messages',
      messagesColor: isDark ? 'text-rose-400' : 'text-rose-600',
      strategy: 'All-to-all broadcast',
    },
    {
      key: 'RandLE-CN',
      name: 'RandLE-CN',
      topology: 'Complete (Clique)',
      rounds: 'O(1) w.h.p.',
      roundsColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      messages: 'O(√n log^(3/2) n)',
      messagesColor: isDark ? 'text-cyan-400' : 'text-sky-600',
      strategy: 'Birthday referee voting',
    },
    {
      key: 'BasicLE-Gen',
      name: 'BasicLE-Gen',
      topology: 'General Graph',
      rounds: 'O(D) rounds',
      roundsColor: isDark ? 'text-amber-400' : 'text-amber-600',
      messages: 'O(D · |E|) worst-case',
      messagesColor: isDark ? 'text-rose-400' : 'text-rose-600',
      strategy: 'Diameter flooding',
    },
    {
      key: 'RandLE-Gen',
      name: 'RandLE-Gen',
      topology: 'General Graph',
      rounds: 'O(D) rounds',
      roundsColor: isDark ? 'text-amber-400' : 'text-amber-600',
      messages: 'Expected O(|E| min{log n, D})',
      messagesColor: isDark ? 'text-cyan-400' : 'text-sky-600',
      strategy: 'Random rank flooding',
    },
  ];

  return (
    <div
      className={`flex flex-col gap-5 p-5 h-full overflow-y-auto select-none transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* 1. Header Overview Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className={statCardClass}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <span>Messages Transmitted</span>
            <div className={iconBoxClass}>
              <BarChart3 size={13} />
            </div>
          </div>
          <div className={`text-2xl font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
            {totalMessages}
          </div>
          <div className={`text-[10.5px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Actual empirical count
          </div>
        </div>

        {/* Metric 2 */}
        <div className={statCardClass}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <span>Theoretical Bound</span>
            <div className={iconBoxClass}>
              <TrendingUp size={13} />
            </div>
          </div>
          <div className={`text-2xl font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            ~{theoreticalMetrics.boundVal}
          </div>
          <div className={`text-[10.5px] font-mono truncate ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
            {theoreticalMetrics.boundFormula}
          </div>
        </div>

        {/* Metric 3 */}
        <div className={statCardClass}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <span>Rounds to Election</span>
            <div className={iconBoxClass}>
              <Cpu size={13} />
            </div>
          </div>
          <div className={`text-2xl font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
            {totalRounds}
          </div>
          <div className={`text-[10.5px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Bound: {theoreticalMetrics.roundFormula}
          </div>
        </div>

        {/* Metric 4 */}
        <div className={statCardClass}>
          <div className={`flex items-center justify-between text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <span>Message Load Factor</span>
            <div className={iconBoxClass}>
              <Zap size={13} />
            </div>
          </div>
          <div className={`text-2xl font-mono font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
            {theoreticalMetrics.efficiency}%
          </div>
          <div className={`text-[10.5px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            Of worst-case budget
          </div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart A: Messages per Round */}
        <div className={sectionCardClass}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                Message Volume per Round
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Displays message drop-off as non-elected nodes halt sending
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                isDark
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Peak: {maxInRound} msgs
            </span>
          </div>

          <div
            className={`w-full h-52 flex items-end gap-1.5 pt-4 pb-2 px-2 border-b border-l relative rounded ${
              isDark ? 'border-zinc-800 bg-zinc-950/60' : 'border-slate-200 bg-slate-50'
            }`}
          >
            {roundMessageSeries.map((item, idx) => {
              const barHeightPct = Math.max(8, (item.inRound / maxInRound) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                >
                  {/* Tooltip */}
                  <div
                    className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity border px-2 py-1 rounded text-[10px] font-mono pointer-events-none whitespace-nowrap z-20 shadow-lg ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    R{item.round}: {item.inRound} msgs (Total: {item.cumulative})
                  </div>

                  {/* Clean bar */}
                  <div
                    style={{ height: `${barHeightPct}%` }}
                    className={`w-full max-w-[24px] rounded-t transition-colors ${
                      isDark
                        ? 'bg-zinc-700 group-hover:bg-zinc-500'
                        : 'bg-sky-500/80 group-hover:bg-sky-600'
                    }`}
                  />

                  {/* X label */}
                  <span className={`text-[9.5px] font-mono mt-1.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    {item.round}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={`flex justify-between text-[10.5px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            <span>R0 (Init)</span>
            <span>Synchronous Rounds &rarr;</span>
            <span>R{totalRounds} (Terminated)</span>
          </div>
        </div>

        {/* Chart B: Asymptotic Growth Curves */}
        <div className={sectionCardClass}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
                Asymptotic Growth vs Actual Run
              </h3>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                Current run: n={n}, M={totalMessages}
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-mono">
              <span className={`flex items-center gap-1 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                <span className={`w-2 h-0.5 ${isDark ? 'bg-rose-400' : 'bg-rose-500'}`}></span> O(n²)
              </span>
              <span className={`flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                <span className={`w-2 h-0.5 ${isDark ? 'bg-amber-400' : 'bg-amber-500'}`}></span> O(n log n)
              </span>
              <span className={`flex items-center gap-1 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                <span className={`w-2 h-0.5 ${isDark ? 'bg-cyan-400' : 'bg-cyan-600'}`}></span> O(√n log n)
              </span>
            </div>
          </div>

          <div
            className={`w-full flex justify-center rounded p-1 ${
              isDark ? 'bg-zinc-950/60' : 'bg-slate-50 border border-slate-200'
            }`}
          >
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              className="w-full max-w-[580px] h-52 select-none"
            >
              {/* Grid Lines */}
              {[0, 150, 300, 450, 576].map((gy) => (
                <line
                  key={gy}
                  x1={graphPad.left}
                  y1={scaleY(gy)}
                  x2={graphWidth - graphPad.right}
                  y2={scaleY(gy)}
                  stroke={isDark ? '#27272a' : '#e2e8f0'}
                  strokeDasharray="3 3"
                />
              ))}

              {/* Curve 1: O(n^2) */}
              <path d={makeLinePath('quadratic')} fill="none" stroke="#f43f5e" strokeWidth="1.8" />

              {/* Curve 2: O(n log n) */}
              <path d={makeLinePath('nLogN')} fill="none" stroke="#f59e0b" strokeWidth="1.8" />

              {/* Curve 3: Sub-quadratic */}
              <path d={makeLinePath('subQuadratic')} fill="none" stroke="#06b6d4" strokeWidth="1.8" />

              {/* Simulation Point Marker */}
              {(() => {
                const ptX = scaleX(n);
                const ptY = scaleY(totalMessages);
                return (
                  <g transform={`translate(${ptX}, ${ptY})`}>
                    <circle
                      r="4.5"
                      fill="#0284c7"
                      stroke={isDark ? '#ffffff' : '#0f172a'}
                      strokeWidth="1.5"
                    />
                    <g transform="translate(8, -10)">
                      <rect
                        x="-4"
                        y="-12"
                        width="80"
                        height="18"
                        rx="4"
                        fill={isDark ? '#18181b' : '#ffffff'}
                        stroke={isDark ? '#3f3f46' : '#cbd5e1'}
                        strokeWidth="1"
                      />
                      <text
                        x="36"
                        y="0.5"
                        textAnchor="middle"
                        fill={isDark ? '#f4f4f5' : '#0f172a'}
                        fontSize="9.5"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        n={n}, M={totalMessages}
                      </text>
                    </g>
                  </g>
                );
              })()}

              {/* X Axis */}
              <line
                x1={graphPad.left}
                y1={graphHeight - graphPad.bottom}
                x2={graphWidth - graphPad.right}
                y2={graphHeight - graphPad.bottom}
                stroke={isDark ? '#3f3f46' : '#cbd5e1'}
                strokeWidth="1"
              />
              {[4, 8, 12, 16, 20, 24].map((lx) => (
                <text
                  key={lx}
                  x={scaleX(lx)}
                  y={graphHeight - 12}
                  textAnchor="middle"
                  fill={isDark ? '#71717a' : '#64748b'}
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {lx}
                </text>
              ))}

              {/* Y Axis */}
              <line
                x1={graphPad.left}
                y1={graphPad.top}
                x2={graphPad.left}
                y2={graphHeight - graphPad.bottom}
                stroke={isDark ? '#3f3f46' : '#cbd5e1'}
                strokeWidth="1"
              />
              {[0, 200, 400, 576].map((ly) => (
                <text
                  key={ly}
                  x={graphPad.left - 6}
                  y={scaleY(ly) + 3}
                  textAnchor="end"
                  fill={isDark ? '#71717a' : '#64748b'}
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {ly}
                </text>
              ))}
            </svg>
          </div>
          <div className={`text-[10px] text-center font-mono ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
            X-Axis: Node Count (n) &middot; Y-Axis: Cumulative Messages Transmitted
          </div>
        </div>
      </div>

      {/* 3. Bottom Table: Full Complexity Matrix */}
      <div className={sectionCardClass}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-xs ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              Distributed Leader Election Complexity Matrix
            </h3>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              Theoretical time and message complexity bounds across synchronous network models
            </p>
          </div>
          <span
            className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
              isDark
                ? 'text-zinc-400 bg-zinc-800 border-zinc-700'
                : 'text-slate-600 bg-slate-100 border-slate-200'
            }`}
          >
            7 Algorithms Implemented
          </span>
        </div>

        <div className="overflow-x-auto mt-1">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr
                className={`border-b font-semibold uppercase tracking-wider text-[10px] ${
                  isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-500'
                }`}
              >
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Topology</th>
                <th className="py-2.5 px-3">Time (Rounds)</th>
                <th className="py-2.5 px-3">Message Complexity</th>
                <th className="py-2.5 px-3">Strategy</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono text-[11px] ${isDark ? 'divide-zinc-800/60' : 'divide-slate-200'}`}>
              {matrixRows.map((row) => {
                const isSelected = selectedAlg === row.key;
                return (
                  <tr
                    key={row.key}
                    className={`transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-zinc-800/80 text-zinc-100 font-semibold'
                          : 'bg-sky-50 text-slate-900 font-semibold'
                        : isDark
                        ? 'text-zinc-300 hover:bg-zinc-800/40'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium font-sans">{row.name}</td>
                    <td className={`py-2.5 px-3 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>{row.topology}</td>
                    <td className={`py-2.5 px-3 ${row.roundsColor}`}>{row.rounds}</td>
                    <td className={`py-2.5 px-3 ${row.messagesColor}`}>{row.messages}</td>
                    <td className={`py-2.5 px-3 font-sans ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      {row.strategy}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
