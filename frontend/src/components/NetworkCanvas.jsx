import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Sparkles,
  ArrowRight,
  Eye,
  Send,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Pause,
  Play
} from 'lucide-react';

export default function NetworkCanvas({
  graph,
  currentRoundData,
  selectedNode,
  onSelectNode,
  isFinished = false,
  isMotionPaused = false,
  animTime = 0.5
}) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [showTransitDrawer, setShowTransitDrawer] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 900,
          height: clientHeight || 600,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  if (!graph || !graph.nodes || !currentRoundData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#09090b] text-zinc-500 font-mono-code text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-zinc-600 animate-ping"></div>
          <span>Synthesizing network topology...</span>
        </div>
      </div>
    );
  }

  const { width, height } = dimensions;
  const padding = 75;
  const drawWidth = width - padding * 2;
  const drawHeight = height - padding * 2;

  // Convert 0..1 normalized coordinates to canvas pixels
  const getNodePos = (node) => {
    return {
      x: padding + (node.x ?? 0.5) * drawWidth,
      y: padding + (node.y ?? 0.5) * drawHeight,
    };
  };

  const nodePosMap = {};
  graph.nodes.forEach((n) => {
    nodePosMap[n.node_id] = getNodePos(n);
  });

  const nodeStates = currentRoundData.nodes || {};
  const inFlight = currentRoundData.in_flight || [];
  const leaders = currentRoundData.leaders || [];

  const activeSenders = new Set(inFlight.map((m) => m.src));
  const activeReceivers = new Set(inFlight.map((m) => m.dst));

  const isRing = graph.topology === 'ring' || graph.topology === 'Cycle';
  const centerX = width / 2;
  const centerY = height / 2;
  const ringRadius = Math.min(drawWidth, drawHeight) * 0.46;

  // Quadratic Bezier curve offset to cleanly separate opposing directions
  const getCurvedEdgePath = (srcId, dstId) => {
    const p1 = nodePosMap[srcId];
    const p2 = nodePosMap[dstId];
    if (!p1 || !p2) return '';

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;

    const curvature = Math.min(24, dist * 0.1);
    const midX = (p1.x + p2.x) / 2 + nx * curvature;
    const midY = (p1.y + p2.y) / 2 + ny * curvature;

    return `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;
  };

  const getPointOnCurve = (srcId, dstId, t) => {
    const p1 = nodePosMap[srcId];
    const p2 = nodePosMap[dstId];
    if (!p1 || !p2) return { x: 0, y: 0 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const curvature = Math.min(24, dist * 0.1);
    const midX = (p1.x + p2.x) / 2 + nx * curvature;
    const midY = (p1.y + p2.y) / 2 + ny * curvature;

    const u = 1 - t;
    const x = u * u * p1.x + 2 * u * t * midX + t * t * p2.x;
    const y = u * u * p1.y + 2 * u * t * midY + t * t * p2.y;
    return { x, y };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] flex items-center justify-center bg-[#09090b] overflow-hidden select-none"
    >
      {/* 1. Subtle Engineering Grid Background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]">
        <defs>
          <pattern id="canvas-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#ffffff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-grid)" />
      </svg>

      {/* 2. Main Vector Graph Canvas */}
      <svg className="w-full h-full relative z-10">
        <defs>
          {/* Subtle directional markers */}
          <marker
            id="edge-arrow"
            viewBox="0 0 10 10"
            refX="28"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
          >
            <path d="M 1 2 L 7 5 L 1 8 z" fill="#3f3f46" />
          </marker>
          <marker
            id="edge-arrow-active"
            viewBox="0 0 10 10"
            refX="28"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto"
          >
            <path d="M 1 2 L 7 5 L 1 8 z" fill="#38bdf8" />
          </marker>

          {/* Crisp, subtle glow filter (no excessive AI blur) */}
          <filter id="subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ring Guide Track */}
        {isRing && (
          <circle
            cx={centerX}
            cy={centerY}
            r={ringRadius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
            strokeDasharray="2 4"
            className="pointer-events-none"
          />
        )}

        {/* 1. Base Graph Edges */}
        <g className="edges">
          {graph.edges.map((e, idx) => {
            const p1 = nodePosMap[e.source];
            const p2 = nodePosMap[e.target];
            if (!p1 || !p2) return null;

            return (
              <line
                key={`base-edge-${e.source}-${e.target}-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1.2"
              />
            );
          })}
        </g>

        {/* 2. Active Directed Message Paths */}
        <g className="active-paths">
          {inFlight.map((msg) => {
            const pathD = getCurvedEdgePath(msg.src, msg.dst);
            const isHovered = hoveredMessageId === msg.id;
            const isRelated =
              selectedNode === null || msg.src === selectedNode || msg.dst === selectedNode;

            if (!pathD) return null;

            return (
              <g
                key={`path-${msg.id}`}
                className={`transition-opacity duration-150 ${
                  isRelated ? 'opacity-100' : 'opacity-15'
                }`}
              >
                {/* Subtle path glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={msg.color || '#38bdf8'}
                  strokeWidth={isHovered ? 3.5 : 2}
                  strokeOpacity={isHovered ? 0.35 : 0.18}
                />

                {/* Flowing animated dash */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={msg.color || '#38bdf8'}
                  strokeWidth={isHovered ? 2.2 : 1.6}
                  strokeDasharray="6 5"
                  className={isMotionPaused ? '' : 'edge-flow'}
                  markerEnd="url(#edge-arrow-active)"
                />
              </g>
            );
          })}
        </g>

        {/* 3. Message Packets (Clean, high-precision engineering pills) */}
        <g className="message-packets">
          {inFlight.map((msg) => {
            const t = 0.14 + animTime * (0.86 - 0.14);
            const curPos = getPointOnCurve(msg.src, msg.dst, t);
            const packetColor = msg.color || '#38bdf8';
            const isHovered = hoveredMessageId === msg.id;
            const isRelated =
              selectedNode === null || msg.src === selectedNode || msg.dst === selectedNode;

            const labelText = `n${msg.src} → n${msg.dst}: ${msg.label}`;
            const pillWidth = Math.max(88, labelText.length * 6.5 + 20);

            return (
              <g
                key={`packet-${msg.id}`}
                transform={`translate(${curPos.x}, ${curPos.y})`}
                className={`pointer-events-none transition-opacity duration-150 ${
                  isRelated ? 'opacity-100' : 'opacity-15'
                }`}
              >
                {/* Small indicator dot on the wire */}
                <circle
                  r="4"
                  fill={packetColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />

                {/* Crisp floating label pill */}
                <g transform="translate(0, -18)">
                  <rect
                    x={-pillWidth / 2}
                    y="-10"
                    width={pillWidth}
                    height="20"
                    rx="10"
                    fill="#18181b"
                    stroke={isHovered ? packetColor : 'rgba(255, 255, 255, 0.16)'}
                    strokeWidth="1"
                    filter="url(#subtle-glow)"
                  />
                  {/* Status dot */}
                  <circle
                    cx={-pillWidth / 2 + 8}
                    cy="0"
                    r="2.5"
                    fill={packetColor}
                  />
                  {/* Text */}
                  <text
                    textAnchor="middle"
                    x="4"
                    y="3"
                    fill="#f4f4f6"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="ui-monospace, monospace"
                  >
                    {labelText}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* 4. Nodes (Clean architectural design) */}
        <g className="nodes">
          {graph.nodes.map((node) => {
            const pos = nodePosMap[node.node_id];
            if (!pos) return null;

            const st = nodeStates[node.node_id] || { status: 'active', id: node.id_value };
            const isLeader = leaders.includes(node.node_id) || st.status === 'elected';
            const isCandidate = st.status === 'candidate';
            const isNonElected = st.status === 'non-elected';
            const isSelected = selectedNode === node.node_id;
            const isHovered = hoveredNode === node.node_id;

            const isSender = activeSenders.has(node.node_id);
            const isReceiver = activeReceivers.has(node.node_id);

            // Intentional palette
            let bgFill = '#18181b';
            let strokeColor = 'rgba(255, 255, 255, 0.2)';
            let statusDot = '#71717a';
            let statusText = 'active';

            if (isLeader) {
              bgFill = '#09251d';
              strokeColor = '#10b981';
              statusDot = '#10b981';
              statusText = 'elected';
            } else if (isCandidate) {
              bgFill = '#241a0b';
              strokeColor = '#f59e0b';
              statusDot = '#f59e0b';
              statusText = 'candidate';
            } else if (isNonElected) {
              bgFill = '#111114';
              strokeColor = 'rgba(255, 255, 255, 0.08)';
              statusDot = '#3f3f46';
              statusText = 'passive';
            }

            const nodeRadius = isLeader ? 27 : 23;

            return (
              <g
                key={`node-${node.node_id}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => onSelectNode(node.node_id)}
                onMouseEnter={() => setHoveredNode(node.node_id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer group"
              >
                {/* Leader Subtle Halo */}
                {isLeader && (
                  <circle
                    r={nodeRadius + 8}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.2"
                    strokeDasharray="2 3"
                    className="animate-subtle-beacon"
                  />
                )}

                {/* Selection Ring */}
                {(isSelected || isHovered) && (
                  <circle
                    r={nodeRadius + 6}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Sender Indicator Ring */}
                {isSender && (
                  <circle
                    r={nodeRadius + 4}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                  />
                )}

                {/* Receiver Indicator Ring */}
                {isReceiver && (
                  <circle
                    r={nodeRadius + 4}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                  />
                )}

                {/* Core Node Circle */}
                <circle
                  r={nodeRadius}
                  fill={bgFill}
                  stroke={isLeader ? '#10b981' : isSelected ? '#38bdf8' : strokeColor}
                  strokeWidth={isLeader ? 2 : 1.5}
                  className="transition-colors duration-150"
                />

                {/* Leader Minimalist Crown SVG */}
                {isLeader && (
                  <g transform={`translate(0, -${nodeRadius + 11})`}>
                    <path
                      d="M -7 4 L -5 -4 L -2 0 L 0 -5 L 2 0 L 5 -4 L 7 4 Z"
                      fill="#10b981"
                      stroke="#047857"
                      strokeWidth="0.8"
                    />
                  </g>
                )}

                {/* Node Assigned ID Number */}
                <text
                  textAnchor="middle"
                  dy="-1"
                  fill="#ffffff"
                  fontSize="13.5"
                  fontWeight="700"
                  fontFamily="-apple-system, sans-serif"
                  className="select-none pointer-events-none"
                >
                  {node.id_value}
                </text>

                {/* Topology Index Subscript */}
                <text
                  textAnchor="middle"
                  dy="11"
                  fill="#71717a"
                  fontSize="8"
                  fontWeight="500"
                  fontFamily="ui-monospace, monospace"
                  className="select-none pointer-events-none"
                >
                  n{node.node_id}
                </text>

                {/* Status Dot Micro-Badge */}
                <g transform={`translate(0, ${nodeRadius + 12})`}>
                  <rect
                    x="-24"
                    y="-6"
                    width="48"
                    height="12"
                    rx="6"
                    fill="#18181b"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="0.8"
                  />
                  <circle cx="-16" cy="0" r="2" fill={statusDot} />
                  <text
                    textAnchor="middle"
                    x="3"
                    y="2.5"
                    fill="#a1a1aa"
                    fontSize="7"
                    fontWeight="600"
                    letterSpacing="0.4"
                    fontFamily="-apple-system, sans-serif"
                  >
                    {statusText.toUpperCase()}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* 3. Top-Left Minimalist HUD Controls */}
      <div className="absolute top-3.5 left-4 z-20 flex items-center gap-2 text-xs">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="surface-button px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 text-xs font-medium"
        >
          <Info size={13} className="text-zinc-400" />
          <span>Legend</span>
        </button>

        {showLegend && (
          <div className="surface-card px-3 py-1.5 rounded-lg flex items-center gap-3.5 text-[11px] text-zinc-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Candidate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-600"></span> Passive
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Leader
            </span>
            <span className="h-3 w-px bg-zinc-800"></span>
            <span className="flex items-center gap-1.5 text-sky-400 font-mono-code text-[10.5px]">
              <span className="w-2 h-2 rounded-sm bg-sky-400"></span> In-Transit
            </span>
          </div>
        )}
      </div>

      {/* 4. Top-Right Election Status Milestone */}
      {isFinished ? (
        <div className="absolute top-3.5 right-4 z-20 surface-card border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Crown size={14} />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
              Election Concluded
            </div>
            <div className="text-xs font-bold text-zinc-200 font-mono-code">
              Leader: Node {leaders.join(', ')}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute top-3.5 right-4 z-20 surface-button px-3 py-1.5 rounded-lg text-xs font-mono-code text-zinc-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
          <span>Round {currentRoundData.round}</span>
        </div>
      )}

      {/* 5. Bottom-Left Collapsible Message Transit Stream */}
      <div className="absolute bottom-3.5 left-4 z-20 flex flex-col gap-1.5 max-w-sm w-full">
        <button
          onClick={() => setShowTransitDrawer(!showTransitDrawer)}
          className="surface-button px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white flex items-center justify-between w-auto self-start"
        >
          <div className="flex items-center gap-2">
            <Send size={12} className="text-sky-400" />
            <span>Messages in Transit</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono-code bg-zinc-800 text-zinc-300">
              {inFlight.length}
            </span>
          </div>
          {showTransitDrawer ? <ChevronDown size={13} className="ml-2 text-zinc-500" /> : <ChevronUp size={13} className="ml-2 text-zinc-500" />}
        </button>

        {showTransitDrawer && (
          <div className="surface-card rounded-xl p-2.5 max-h-40 overflow-y-auto flex flex-col gap-1">
            {inFlight.length === 0 ? (
              <div className="text-center py-3 text-zinc-500 text-xs font-mono-code">
                No active packets this round.
              </div>
            ) : (
              inFlight.map((m) => {
                const isHovered = hoveredMessageId === m.id;
                return (
                  <div
                    key={m.id}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isHovered
                        ? 'bg-zinc-800/90 text-white'
                        : 'bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono-code text-[11px]">
                      <span className="text-sky-400 font-semibold">Node {m.src}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-emerald-400 font-semibold">Node {m.dst}</span>
                      <span className="text-zinc-500">[{m.label}]</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 6. Precision Node Hover Card */}
      {hoveredNode !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${nodePosMap[hoveredNode]?.x + 18}px`,
            top: `${nodePosMap[hoveredNode]?.y - 32}px`,
          }}
          className="surface-card px-3 py-2 rounded-lg text-xs flex flex-col gap-1 z-30 pointer-events-none border border-white/10 shadow-xl min-w-[130px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
            <span className="font-semibold text-zinc-100">Node {hoveredNode}</span>
            <span className="font-mono-code text-[10.5px] text-zinc-400">
              ID: {nodeStates[hoveredNode]?.id}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Status:</span>
            <span className="font-medium text-zinc-200 capitalize">
              {nodeStates[hoveredNode]?.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
