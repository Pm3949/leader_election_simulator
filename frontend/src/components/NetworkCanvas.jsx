import React, { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Send,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

export default function NetworkCanvas({
  graph,
  currentRoundData,
  selectedNode,
  onSelectNode,
  isFinished = false,
  isMotionPaused = false,
  animTime = 0.5,
  isDark = true
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
      <div
        className={`w-full h-full flex items-center justify-center font-mono-code text-xs ${
          isDark ? 'bg-[#09090b] text-zinc-500' : 'bg-slate-50 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-ping ${isDark ? 'bg-zinc-600' : 'bg-slate-400'}`}></div>
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

  // Single straight link interpolation so opposing messages (u->v and v->u) travel on the same single link
  const getPointOnLink = (srcId, dstId, t) => {
    const p1 = nodePosMap[srcId];
    const p2 = nodePosMap[dstId];
    if (!p1 || !p2) return { x: 0, y: 0, angle: 0, dx: 0, dy: 0, dist: 1 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    return {
      x: p1.x + dx * t,
      y: p1.y + dy * t,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      dx,
      dy,
      dist,
    };
  };

  // Group active in-flight messages by canonical undirected link key "min-max"
  // so multiple or bidirectional messages share ONE single link visually.
  const linkGroups = {};
  inFlight.forEach((msg) => {
    const u = Math.min(msg.src, msg.dst);
    const v = Math.max(msg.src, msg.dst);
    const key = `${u}-${v}`;
    if (!linkGroups[key]) {
      linkGroups[key] = { u, v, msgs: [] };
    }
    linkGroups[key].msgs.push(msg);
  });

  const baseEdgeStroke = isDark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(15, 23, 42, 0.16)';
  const ringGuideStroke = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.08)';
  const gridDotColor = isDark ? '#ffffff' : '#0f172a';
  const activeArrowColor = isDark ? '#38bdf8' : '#0284c7';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[500px] flex items-center justify-center overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#09090b]' : 'bg-slate-50'
      }`}
    >
      {/* 1. Subtle Engineering Grid Background */}
      <svg className={`absolute inset-0 w-full h-full pointer-events-none ${isDark ? 'opacity-[0.035]' : 'opacity-[0.08]'}`}>
        <defs>
          <pattern id="canvas-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill={gridDotColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-grid)" />
      </svg>

      {/* 2. Main Vector Graph Canvas */}
      <svg className="w-full h-full relative z-10">
        <defs>
          {/* Subtle directional markers */}
          <marker
            id="edge-arrow-active"
            viewBox="0 0 10 10"
            refX="28"
            refY="5"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto"
          >
            <path d="M 1 2 L 7 5 L 1 8 z" fill={activeArrowColor} />
          </marker>

          <filter id="subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={isDark ? '3' : '2'} result="blur" />
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
            stroke={ringGuideStroke}
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
                stroke={baseEdgeStroke}
                strokeWidth="1.4"
              />
            );
          })}
        </g>

        {/* 2. Active Message Paths (Strictly ONE single link per node pair) */}
        <g className="active-paths">
          {Object.entries(linkGroups).map(([key, group]) => {
            const { u, v, msgs } = group;
            const hasForward = msgs.some((m) => m.src === u && m.dst === v);
            const hasReverse = msgs.some((m) => m.src === v && m.dst === u);
            const isBidirectional = hasForward && hasReverse;

            // Use primary message for color/direction if unidirectional, or canonical u->v if bidirectional
            const primaryMsg = msgs[0];
            const pathSrc = isBidirectional ? u : primaryMsg.src;
            const pathDst = isBidirectional ? v : primaryMsg.dst;
            const p1 = nodePosMap[pathSrc];
            const p2 = nodePosMap[pathDst];
            if (!p1 || !p2) return null;

            const pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
            const isHovered = msgs.some((m) => hoveredMessageId === m.id);
            const isRelated =
              selectedNode === null ||
              msgs.some((m) => m.src === selectedNode || m.dst === selectedNode);

            const linkColor = isBidirectional
              ? activeArrowColor
              : primaryMsg.color || activeArrowColor;

            return (
              <g
                key={`active-link-${key}`}
                className={`transition-opacity duration-150 ${
                  isRelated ? 'opacity-100' : 'opacity-15'
                }`}
              >
                {/* Single active link glow */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={linkColor}
                  strokeWidth={isHovered ? 4.5 : 3}
                  strokeOpacity={isHovered ? 0.35 : 0.2}
                />

                {/* Single active link line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={linkColor}
                  strokeWidth={isHovered ? 2.4 : 1.8}
                  strokeDasharray={isBidirectional ? undefined : '6 5'}
                  className={isBidirectional || isMotionPaused ? '' : 'edge-flow'}
                  markerEnd={isBidirectional ? undefined : 'url(#edge-arrow-active)'}
                />
              </g>
            );
          })}
        </g>

        {/* 3. Message Packets (Both directions travel directly along the same single link) */}
        <g className="message-packets">
          {Object.entries(linkGroups).flatMap(([, group]) => {
            const { msgs } = group;
            const hasForward = msgs.some((m) => m.src < m.dst);
            const hasReverse = msgs.some((m) => m.src > m.dst);
            const hasBothDirections = hasForward && hasReverse;

            // Count messages per direction for stacking if multiple go same way
            const dirCounts = { fwd: 0, rev: 0 };

            return msgs.map((msg) => {
              const isFwd = msg.src < msg.dst;
              const dirIdx = isFwd ? dirCounts.fwd++ : dirCounts.rev++;

              // Stagger progress slightly only when multiple packets share the exact same direction
              const baseT = 0.14 + animTime * (0.86 - 0.14);
              const tOffset = dirIdx * 0.06;
              const t = Math.min(0.9, Math.max(0.1, baseT - tOffset));

              const curPos = getPointOnLink(msg.src, msg.dst, t);
              const packetColor = msg.color || activeArrowColor;
              const isHovered = hoveredMessageId === msg.id;
              const isRelated =
                selectedNode === null || msg.src === selectedNode || msg.dst === selectedNode;

              const labelText = `n${msg.src} → n${msg.dst}: ${msg.label}`;
              const pillWidth = Math.max(88, labelText.length * 6.5 + 20);

              // Keep dots strictly on the single link, while offsetting label pills when crossing
              const mostlyHorizontal = Math.abs(curPos.dx) >= Math.abs(curPos.dy);
              let pillX = 0;
              let pillY = -18 - dirIdx * 22;

              if (hasBothDirections) {
                const sign = isFwd ? -1 : 1;
                if (mostlyHorizontal) {
                  pillX = 0;
                  pillY = sign * (20 + dirIdx * 22);
                } else {
                  pillX = sign * (pillWidth * 0.5 + 14);
                  pillY = sign * (6 + dirIdx * 22);
                }
              }

              return (
                <g
                  key={`packet-${msg.id}`}
                  transform={`translate(${curPos.x}, ${curPos.y})`}
                  className={`pointer-events-none transition-opacity duration-150 ${
                    isRelated ? 'opacity-100' : 'opacity-15'
                  }`}
                >
                  {/* Subtle connector line from wire dot to floating pill when offset */}
                  {(hasBothDirections || dirIdx > 0) && (
                    <line
                      x1="0"
                      y1="0"
                      x2={pillX}
                      y2={pillY}
                      stroke={packetColor}
                      strokeWidth="1"
                      strokeOpacity="0.45"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Directional packet marker + dot directly on the single link */}
                  <g transform={`rotate(${curPos.angle})`}>
                    <circle
                      r="4.5"
                      fill={packetColor}
                      stroke={isDark ? '#ffffff' : '#0f172a'}
                      strokeWidth="1.4"
                    />
                    <path
                      d="M 5.5 -3 L 10.5 0 L 5.5 3 Z"
                      fill={packetColor}
                    />
                  </g>

                  {/* Crisp floating label pill */}
                  <g transform={`translate(${pillX}, ${pillY})`}>
                    <rect
                      x={-pillWidth / 2}
                      y="-10"
                      width={pillWidth}
                      height="20"
                      rx="10"
                      fill={isDark ? '#18181b' : '#ffffff'}
                      stroke={
                        isHovered
                          ? packetColor
                          : isDark
                          ? 'rgba(255, 255, 255, 0.16)'
                          : 'rgba(15, 23, 42, 0.16)'
                      }
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
                      fill={isDark ? '#f4f4f6' : '#0f172a'}
                      fontSize="9.5"
                      fontWeight="600"
                      fontFamily="ui-monospace, monospace"
                    >
                      {labelText}
                    </text>
                  </g>
                </g>
              );
            });
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

            // Intentional palette for Dark & Light themes
            let bgFill = isDark ? '#18181b' : '#ffffff';
            let strokeColor = isDark ? 'rgba(255, 255, 255, 0.22)' : '#cbd5e1';
            let idTextColor = isDark ? '#ffffff' : '#0f172a';
            let subTextColor = isDark ? '#71717a' : '#64748b';
            let statusDot = isDark ? '#71717a' : '#64748b';
            let statusText = 'active';

            if (isLeader) {
              bgFill = isDark ? '#09251d' : '#ecfdf5';
              strokeColor = '#10b981';
              idTextColor = isDark ? '#ffffff' : '#065f46';
              subTextColor = isDark ? '#6ee7b7' : '#047857';
              statusDot = '#10b981';
              statusText = 'elected';
            } else if (isCandidate) {
              bgFill = isDark ? '#241a0b' : '#fffbeb';
              strokeColor = '#f59e0b';
              idTextColor = isDark ? '#ffffff' : '#92400e';
              subTextColor = isDark ? '#fcd34d' : '#b45309';
              statusDot = '#f59e0b';
              statusText = 'candidate';
            } else if (isNonElected) {
              bgFill = isDark ? '#111114' : '#f1f5f9';
              strokeColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#cbd5e1';
              idTextColor = isDark ? '#a1a1aa' : '#64748b';
              subTextColor = isDark ? '#52525b' : '#94a3b8';
              statusDot = isDark ? '#3f3f46' : '#94a3b8';
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
                    stroke={activeArrowColor}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Sender Indicator Ring */}
                {isSender && (
                  <circle
                    r={nodeRadius + 4}
                    fill="none"
                    stroke={activeArrowColor}
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
                  stroke={isLeader ? '#10b981' : isSelected ? activeArrowColor : strokeColor}
                  strokeWidth={isLeader ? 2.2 : 1.6}
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
                  fill={idTextColor}
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
                  fill={subTextColor}
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
                    fill={isDark ? '#18181b' : '#ffffff'}
                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.14)'}
                    strokeWidth="0.8"
                  />
                  <circle cx="-16" cy="0" r="2" fill={statusDot} />
                  <text
                    textAnchor="middle"
                    x="3"
                    y="2.5"
                    fill={isDark ? '#a1a1aa' : '#475569'}
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
          className={`surface-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium ${
            isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Info size={13} className={isDark ? 'text-zinc-400' : 'text-slate-500'} />
          <span>Legend</span>
        </button>

        {showLegend && (
          <div
            className={`surface-card px-3 py-1.5 rounded-lg flex items-center gap-3.5 text-[11px] ${
              isDark ? 'text-zinc-300' : 'text-slate-700'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-zinc-400' : 'bg-slate-600'}`}></span> Active
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Candidate
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isDark ? 'bg-zinc-600' : 'bg-slate-300'}`}></span> Passive
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Leader
            </span>
            <span className={`h-3 w-px ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}></span>
            <span
              className={`flex items-center gap-1.5 font-mono-code text-[10.5px] ${
                isDark ? 'text-sky-400' : 'text-sky-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-sm ${isDark ? 'bg-sky-400' : 'bg-sky-600'}`}></span> In-Transit
            </span>
          </div>
        )}
      </div>

      {/* 4. Top-Right Election Status Milestone */}
      {isFinished ? (
        <div className="absolute top-3.5 right-4 z-20 surface-card border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Crown size={14} />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">
              Election Concluded
            </div>
            <div className={`text-xs font-bold font-mono-code ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>
              Leader: Node {leaders.join(', ')}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`absolute top-3.5 right-4 z-20 surface-button px-3 py-1.5 rounded-lg text-xs font-mono-code flex items-center gap-2 ${
            isDark ? 'text-zinc-400' : 'text-slate-600'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
          <span>Round {currentRoundData.round}</span>
        </div>
      )}

      {/* 5. Bottom-Left Collapsible Message Transit Stream */}
      <div className="absolute bottom-3.5 left-4 z-20 flex flex-col gap-1.5 max-w-sm w-full">
        <button
          onClick={() => setShowTransitDrawer(!showTransitDrawer)}
          className={`surface-button px-3 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between w-auto self-start ${
            isDark ? 'text-zinc-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <Send size={12} className="text-sky-500" />
            <span>Messages in Transit</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono-code ${
                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {inFlight.length}
            </span>
          </div>
          {showTransitDrawer ? (
            <ChevronDown size={13} className={`ml-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
          ) : (
            <ChevronUp size={13} className={`ml-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
          )}
        </button>

        {showTransitDrawer && (
          <div className="surface-card rounded-xl p-2.5 max-h-40 overflow-y-auto flex flex-col gap-1">
            {inFlight.length === 0 ? (
              <div className={`text-center py-3 text-xs font-mono-code ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
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
                        ? isDark
                          ? 'bg-zinc-800/90 text-white'
                          : 'bg-slate-200 text-slate-900'
                        : isDark
                        ? 'bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800/50'
                        : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono-code text-[11px]">
                      <span className={`font-semibold ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>Node {m.src}</span>
                      <span className={isDark ? 'text-zinc-600' : 'text-slate-400'}>→</span>
                      <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Node {m.dst}</span>
                      <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>[{m.label}]</span>
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
          className={`surface-card px-3 py-2 rounded-lg text-xs flex flex-col gap-1 z-30 pointer-events-none shadow-xl min-w-[130px] ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b pb-1 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              Node {hoveredNode}
            </span>
            <span className={`font-mono-code text-[10.5px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              ID: {nodeStates[hoveredNode]?.id}
            </span>
          </div>
          <div className={`text-[11px] flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            <span>Status:</span>
            <span className={`font-medium capitalize ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              {nodeStates[hoveredNode]?.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
