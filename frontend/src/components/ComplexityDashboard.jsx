import React, { useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Cpu,
  Layers,
  ArrowUpRight,
  Activity,
  Zap,
  Info
} from 'lucide-react';

export default function ComplexityDashboard({
  simData,
  selectedAlg,
  nodeCount
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

  return (
    <div className="flex flex-col gap-5 p-5 h-full overflow-y-auto bg-[#09090b] text-zinc-100 select-none">
      {/* 1. Header Overview Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Messages Transmitted</span>
            <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
              <BarChart3 size={13} />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">{totalMessages}</div>
          <div className="text-[10.5px] text-zinc-500 font-mono">Actual empirical count</div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Theoretical Bound</span>
            <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
              <TrendingUp size={13} />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            ~{theoreticalMetrics.boundVal}
          </div>
          <div className="text-[10.5px] text-zinc-400 font-mono truncate">
            {theoreticalMetrics.boundFormula}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Rounds to Election</span>
            <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
              <Cpu size={13} />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">{totalRounds}</div>
          <div className="text-[10.5px] text-zinc-500 font-mono">
            Bound: {theoreticalMetrics.roundFormula}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl p-4 bg-zinc-900/60 border border-zinc-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Message Load Factor</span>
            <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
              <Zap size={13} />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {theoreticalMetrics.efficiency}%
          </div>
          <div className="text-[10.5px] text-zinc-500 font-mono">Of worst-case budget</div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart A: Messages per Round */}
        <div className="rounded-xl p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-xs text-zinc-200">
                Message Volume per Round
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Displays message drop-off as non-elected nodes halt sending
              </p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              Peak: {maxInRound} msgs
            </span>
          </div>

          <div className="w-full h-52 flex items-end gap-1.5 pt-4 pb-2 px-2 border-b border-l border-zinc-800 relative bg-zinc-950/60 rounded">
            {roundMessageSeries.map((item, idx) => {
              const barHeightPct = Math.max(8, (item.inRound / maxInRound) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-[10px] font-mono text-zinc-100 pointer-events-none whitespace-nowrap z-20 shadow-lg">
                    R{item.round}: {item.inRound} msgs (Total: {item.cumulative})
                  </div>

                  {/* Clean neutral bar */}
                  <div
                    style={{ height: `${barHeightPct}%` }}
                    className="w-full max-w-[24px] rounded-t bg-zinc-700 group-hover:bg-zinc-500 transition-colors"
                  />

                  {/* X label */}
                  <span className="text-[9.5px] font-mono text-zinc-500 mt-1.5">
                    {item.round}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10.5px] text-zinc-500 font-mono">
            <span>R0 (Init)</span>
            <span>Synchronous Rounds &rarr;</span>
            <span>R{totalRounds} (Terminated)</span>
          </div>
        </div>

        {/* Chart B: Asymptotic Growth Curves */}
        <div className="rounded-xl p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-xs text-zinc-200">
                Asymptotic Growth vs Actual Run
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Current run: n={n}, M={totalMessages}
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-0.5 bg-rose-400"></span> O(n²)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-0.5 bg-amber-400"></span> O(n log n)
              </span>
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2 h-0.5 bg-cyan-400"></span> O(√n log n)
              </span>
            </div>
          </div>

          <div className="w-full flex justify-center bg-zinc-950/60 rounded p-1">
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
                  stroke="#27272a"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Curve 1: O(n^2) */}
              <path
                d={makeLinePath('quadratic')}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.8"
              />

              {/* Curve 2: O(n log n) */}
              <path
                d={makeLinePath('nLogN')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
              />

              {/* Curve 3: Sub-quadratic */}
              <path
                d={makeLinePath('subQuadratic')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
              />

              {/* Simulation Point Marker */}
              {(() => {
                const ptX = scaleX(n);
                const ptY = scaleY(totalMessages);
                return (
                  <g transform={`translate(${ptX}, ${ptY})`}>
                    <circle r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                    <g transform="translate(8, -10)">
                      <rect
                        x="-4"
                        y="-12"
                        width="80"
                        height="18"
                        rx="4"
                        fill="#18181b"
                        stroke="#3f3f46"
                        strokeWidth="1"
                      />
                      <text
                        x="36"
                        y="0.5"
                        textAnchor="middle"
                        fill="#f4f4f5"
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
                stroke="#3f3f46"
                strokeWidth="1"
              />
              {[4, 8, 12, 16, 20, 24].map((lx) => (
                <text
                  key={lx}
                  x={scaleX(lx)}
                  y={graphHeight - 12}
                  textAnchor="middle"
                  fill="#71717a"
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
                stroke="#3f3f46"
                strokeWidth="1"
              />
              {[0, 200, 400, 576].map((ly) => (
                <text
                  key={ly}
                  x={graphPad.left - 6}
                  y={scaleY(ly) + 3}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {ly}
                </text>
              ))}
            </svg>
          </div>
          <div className="text-[10px] text-zinc-500 text-center font-mono">
            X-Axis: Node Count (n) &middot; Y-Axis: Cumulative Messages Transmitted
          </div>
        </div>
      </div>

      {/* 3. Bottom Table: Full Complexity Matrix (Pandurangan Ch. 5) */}
      <div className="rounded-xl p-4 bg-zinc-900/40 border border-zinc-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-xs text-zinc-200">
              Distributed Leader Election Complexity Matrix
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Theoretical bounds from Gopal Pandurangan's <i>Distributed Network Algorithms</i> (Chapter 5)
            </p>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono font-medium px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
            7 Algorithms Implemented
          </span>
        </div>

        <div className="overflow-x-auto mt-1">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Topology</th>
                <th className="py-2.5 px-3">Time (Rounds)</th>
                <th className="py-2.5 px-3">Message Complexity</th>
                <th className="py-2.5 px-3">Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              <tr
                className={`transition-colors ${
                  selectedAlg === 'BasicLE-Ring' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">BasicLE-Ring (LCR)</td>
                <td className="py-2.5 px-3 text-zinc-400">Ring (Unidirectional)</td>
                <td className="py-2.5 px-3 text-amber-400">O(n)</td>
                <td className="py-2.5 px-3 text-rose-400">O(n²) worst; O(n log n) avg</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">Clockwise token filtering</td>
              </tr>
              <tr
                className={`transition-colors ${
                  selectedAlg === 'ImprovedLE-Ring' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">ImprovedLE-Ring (HS)</td>
                <td className="py-2.5 px-3 text-zinc-400">Ring (Bidirectional)</td>
                <td className="py-2.5 px-3 text-amber-400">O(n)</td>
                <td className="py-2.5 px-3 text-emerald-400">O(n log n) deterministic</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">Phased 2^k doubling probes</td>
              </tr>
              <tr
                className={`transition-colors ${
                  selectedAlg === 'RandLE-Ring' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">RandLE-Ring</td>
                <td className="py-2.5 px-3 text-zinc-400">Ring (Unidirectional)</td>
                <td className="py-2.5 px-3 text-amber-400">O(n)</td>
                <td className="py-2.5 px-3 text-emerald-400">Expected O(n log n)</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">Random rank sampling</td>
              </tr>
              <tr
                className={`transition-colors ${
                  selectedAlg === 'SimpleLE-CN' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">SimpleLE-CN</td>
                <td className="py-2.5 px-3 text-zinc-400">Complete (Clique)</td>
                <td className="py-2.5 px-3 text-emerald-400">1 round</td>
                <td className="py-2.5 px-3 text-rose-400">Θ(n²) messages</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">All-to-all broadcast</td>
              </tr>
              <tr
                className={`transition-colors ${
                  selectedAlg === 'RandLE-CN' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">RandLE-CN</td>
                <td className="py-2.5 px-3 text-zinc-400">Complete (Clique)</td>
                <td className="py-2.5 px-3 text-emerald-400">O(1) w.h.p.</td>
                <td className="py-2.5 px-3 text-cyan-400">O(√n log^(3/2) n)</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">Birthday referee voting</td>
              </tr>
              <tr
                className={`transition-colors ${
                  selectedAlg === 'BasicLE-Gen' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">BasicLE-Gen</td>
                <td className="py-2.5 px-3 text-zinc-400">General Graph</td>
                <td className="py-2.5 px-3 text-amber-400">O(D) rounds</td>
                <td className="py-2.5 px-3 text-rose-400">O(D · |E|) worst-case</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">Diameter flooding</td>
              </tr>
              <tr
                className={`transition-colors ${
                  selectedAlg === 'RandLE-Gen' ? 'bg-zinc-800/80 text-zinc-100 font-semibold' : 'text-zinc-300 hover:bg-zinc-850'
                }`}
              >
                <td className="py-2.5 px-3 font-medium font-sans">RandLE-Gen</td>
                <td className="py-2.5 px-3 text-zinc-400">General Graph</td>
                <td className="py-2.5 px-3 text-amber-400">O(D) rounds</td>
                <td className="py-2.5 px-3 text-cyan-400">{"Expected O(|E| min{log n, D})"}</td>
                <td className="py-2.5 px-3 text-zinc-400 font-sans">Random rank flooding</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
