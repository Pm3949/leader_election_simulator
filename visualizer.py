import json
import streamlit as st
import streamlit.components.v1 as components

def get_message_display_info(kind, payload):
    """Format payload into human-friendly label and color."""
    label = kind
    color = "#ef4444"

    if kind == "ID_TOKEN":
        label = f"ID: {payload.get('token', '')}"
        color = "#ef4444"
    elif kind == "RANK_TOKEN":
        key = payload.get('key', '')
        if isinstance(key, (tuple, list)):
            label = f"R:{round(key[0], 2)} (ID:{key[1]})"
        else:
            label = f"Key: {key}"
        color = "#f97316"
    elif kind == "PROBE":
        tok = payload.get('token', '')
        rem = payload.get('remaining', '')
        label = f"Probe {tok} (hop:{rem})"
        color = "#8b5cf6"
    elif kind == "RETURN":
        orig = payload.get('origin', '')
        label = f"Return -> {orig}"
        color = "#06b6d4"
    elif kind == "ID_BROADCAST":
        label = f"ID: {payload.get('node_id', '')}"
        color = "#3b82f6"
    elif kind == "CANDIDATE_RANK":
        label = f"Rank: {payload.get('rank', '')}"
        color = "#ec4899"
    elif kind == "REFEREE_WIN":
        label = "Vote: WIN"
        color = "#10b981"
    elif kind in ("MIN_UPDATE", "RANK_UPDATE"):
        val = payload.get('value', '')
        if isinstance(val, float):
            val = round(val, 3)
        label = f"Min: {val}"
        color = "#0ea5e9"
    elif 'token' in payload:
        label = f"Token: {payload['token']}"
    elif 'value' in payload:
        val = payload['value']
        if isinstance(val, float):
            val = round(val, 3)
        label = f"Val: {val}"

    return label, color

def render_visjs_network(sim, graph, ids, pos, height=520):
    """
    Renders a clear, calm Vis.js network with:
    - Calm, stationary message badges along directed arrows (NO continuous looping chaos)
    - Interactive message isolation (Clicking/hovering a node dims everything else)
    - Single-shot 1x delivery animation button (plays once smoothly and docks)
    - Leader crown badge
    - Click-to-inspect drawer with plain-English node reasoning
    """
    target_round = 1 if sim.round == 0 else (sim.round + 1)
    in_flight_raw = sim.pending.get(target_round, [])

    status_palette = {
        'active': {
            'bg': '#2563eb', 'border': '#60a5fa', 'highlight_bg': '#3b82f6', 'highlight_border': '#93c5fd',
            'badge': 'Active', 'badge_bg': 'rgba(37, 99, 235, 0.25)', 'badge_color': '#93c5fd'
        },
        'candidate': {
            'bg': '#d97706', 'border': '#fbbf24', 'highlight_bg': '#f59e0b', 'highlight_border': '#fde68a',
            'badge': 'Candidate', 'badge_bg': 'rgba(217, 119, 6, 0.25)', 'badge_color': '#fde68a'
        },
        'non-elected': {
            'bg': '#475569', 'border': '#94a3b8', 'highlight_bg': '#64748b', 'highlight_border': '#cbd5e1',
            'badge': 'Non-Elected', 'badge_bg': 'rgba(71, 85, 105, 0.3)', 'badge_color': '#cbd5e1'
        },
        'elected': {
            'bg': '#059669', 'border': '#34d399', 'highlight_bg': '#10b981', 'highlight_border': '#a7f3d0',
            'badge': 'Elected Leader', 'badge_bg': 'rgba(5, 150, 105, 0.3)', 'badge_color': '#6ee7b7'
        }
    }

    recent_events_by_node = {}
    for e in sim.events:
        if e.round == sim.round:
            if e.src is not None:
                recent_events_by_node.setdefault(e.src, []).append({'type': e.event, 'details': e.details, 'dir': 'out'})
            if e.dst is not None:
                recent_events_by_node.setdefault(e.dst, []).append({'type': e.event, 'details': e.details, 'dir': 'in'})

    xs = [pos[v][0] for v in graph.nodes]
    ys = [pos[v][1] for v in graph.nodes]
    max_span = max(max(xs) - min(xs) if xs else 1, max(ys) - min(ys) if ys else 1, 0.01)
    scale = 320.0 / max_span if max_span > 0 else 200.0

    nodes_data = []
    for v in graph.nodes:
        node_obj = sim.nodes[v]
        status = node_obj.status
        pal = status_palette.get(status, status_palette['active'])
        is_leader = (status == 'elected')

        px = (pos[v][0] - (min(xs) + max(xs)) / 2.0) * scale
        py = (pos[v][1] - (min(ys) + max(ys)) / 2.0) * scale

        state_repr = {}
        for k, val in node_obj.state.items():
            if isinstance(val, float):
                state_repr[k] = round(val, 4)
            else:
                state_repr[k] = str(val)

        out_msgs = []
        for src, dst, kind, p in in_flight_raw:
            if src == v:
                lbl, col = get_message_display_info(kind, p)
                out_msgs.append({'dst': dst, 'kind': kind, 'label': lbl, 'color': col, 'payload': p})

        in_msgs = []
        for src, dst, kind, p in in_flight_raw:
            if dst == v:
                lbl, col = get_message_display_info(kind, p)
                in_msgs.append({'src': src, 'kind': kind, 'label': lbl, 'color': col, 'payload': p})

        neighbors = list(graph.neighbors(v))

        nodes_data.append({
            'id': v,
            'logical_id': ids[v],
            'label': f"Node {v} [Leader]\nID: {ids[v]}" if is_leader else f"Node {v}\nID: {ids[v]}",
            'status': status,
            'is_leader': is_leader,
            'badge': pal['badge'],
            'badge_bg': pal['badge_bg'],
            'badge_color': pal['badge_color'],
            'x': px,
            'y': py,
            'color': {
                'background': pal['bg'],
                'border': pal['border'],
                'highlight': {
                    'background': pal['highlight_bg'],
                    'border': pal['highlight_border']
                }
            },
            'size': 32 if is_leader else 24,
            'borderWidth': 5 if is_leader else 2.5,
            'neighbors': neighbors,
            'state': state_repr,
            'out_msgs': out_msgs,
            'in_msgs': in_msgs,
            'recent_events': recent_events_by_node.get(v, [])
        })

    edges_data = []
    is_directed_ring = (getattr(sim.algorithm, 'topology', '') == 'ring' and 'Improved' not in getattr(sim.algorithm, 'name', ''))
    for u, v in graph.edges():
        edges_data.append({
            'from': u,
            'to': v,
            'arrows': 'to' if is_directed_ring else '',
            'color': {'color': '#475569', 'highlight': '#38bdf8'},
            'width': 2
        })

    messages_data = []
    for idx, (src, dst, kind, p) in enumerate(in_flight_raw):
        lbl, col = get_message_display_info(kind, p)
        messages_data.append({
            'id': idx,
            'src': src,
            'dst': dst,
            'kind': kind,
            'label': lbl,
            'color': col,
            'payload': {k: (round(v, 3) if isinstance(v, float) else str(v)) for k, v in p.items()}
        })

    nodes_json = json.dumps(nodes_data)
    edges_json = json.dumps(edges_data)
    messages_json = json.dumps(messages_data)
    finished_flag = "true" if sim.finished else "false"
    round_num = sim.round

    html_code = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <style>
        * {{
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          user-select: none;
        }}
        body {{
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #090d16;
          color: #f1f5f9;
          overflow: hidden;
          height: {height}px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }}
        #container {{
          position: relative;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 50% 50%, #111827 0%, #090d16 100%);
        }}
        #network-canvas {{
          width: 100%;
          height: 100%;
        }}

        /* Top Toolbar */
        .top-toolbar {{
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 20;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 6px 10px;
          border-radius: 8px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }}
        .tool-btn {{
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 500;
          padding: 5px 9px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.18s ease;
        }}
        .tool-btn:hover {{
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }}
        .tool-btn.highlight {{
          background: #0284c7;
          border-color: #38bdf8;
          color: #ffffff;
        }}

        /* Isolation Status Banner */
        #isolation-banner {{
          position: absolute;
          top: 56px;
          left: 12px;
          z-index: 20;
          background: rgba(14, 165, 233, 0.2);
          backdrop-filter: blur(8px);
          border: 1px solid #0ea5e9;
          color: #e0f2fe;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          display: none;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }}

        /* Status Badge */
        .status-badge {{
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        }}
        .dot {{
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
        }}
        .dot.active {{
          background: #38bdf8;
        }}

        /* Bottom Legend */
        .bottom-legend {{
          position: absolute;
          bottom: 10px;
          left: 12px;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 11px;
          color: #cbd5e1;
        }}
        .legend-item {{
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }}
        .legend-item:hover {{
          color: #ffffff;
        }}
        .legend-dot {{
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }}

        /* Node Inspector Drawer */
        #node-inspector {{
          position: absolute;
          top: 12px;
          right: 12px;
          width: 300px;
          max-height: calc(100% - 24px);
          overflow-y: auto;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 10px;
          padding: 14px;
          z-index: 30;
          box-shadow: 0 12px 30px rgba(0,0,0,0.6);
          transform: translateX(340px);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }}
        #node-inspector.open {{
          transform: translateX(0);
        }}
        .inspector-header {{
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          padding-bottom: 8px;
          margin-bottom: 8px;
        }}
        .inspector-title {{
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }}
        .close-btn {{
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 15px;
          cursor: pointer;
          padding: 2px 5px;
          border-radius: 4px;
        }}
        .close-btn:hover {{
          color: #ffffff;
          background: rgba(255,255,255,0.1);
        }}
        .inspector-badge {{
          display: inline-block;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 12px;
          margin-top: 4px;
        }}
        .section-label {{
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 9px 0 4px 0;
        }}
        .kv-row {{
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 3px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
        }}
        .kv-key {{
          color: #94a3b8;
        }}
        .kv-val {{
          color: #f1f5f9;
          font-family: monospace;
          font-weight: 600;
        }}
        .msg-chip {{
          background: rgba(255, 255, 255, 0.05);
          border-left: 3px solid #3b82f6;
          padding: 5px 8px;
          border-radius: 4px;
          font-size: 11px;
          margin-bottom: 5px;
          line-height: 1.4;
        }}
        .hint-text {{
          font-size: 11px;
          color: #64748b;
          font-style: italic;
        }}
      <script src="https://unpkg.com/vis-network@10.1.4/standalone/umd/vis-network.min.js"></script>
      <script>
        if (typeof vis === 'undefined') {{
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.9/standalone/umd/vis-network.min.js';
          document.head.appendChild(s);
        }}
      </script>
    </head>
    <body>
      <div id="container">
        <!-- Floating Toolbar -->
        <div class="top-toolbar">
          <button class="tool-btn highlight" id="btn-deliver" title="Animate delivery once from senders to receivers">Play Delivery (1x)</button>
          <button class="tool-btn" id="btn-fit" title="Fit network to view">Fit View</button>
          <button class="tool-btn" id="btn-clear-focus" title="Clear node isolation">Reset Focus</button>
        </div>

        <!-- Node Isolation Banner -->
        <div id="isolation-banner" title="Click to clear focus">
          <span>Focus: Node <span id="isolated-node-id">-</span></span>
          <span style="opacity:0.7;margin-left:4px;">(click to reset)</span>
        </div>

        <!-- Status Pill -->
        <div class="status-badge">
          <div class="dot {'active' if in_flight_raw else ''}"></div>
          <span><strong>Round {round_num}</strong> · {'Complete' if sim.finished else f'{len(in_flight_raw)} message(s) queued'}</span>
        </div>

        <!-- Network Canvas -->
        <div id="network-canvas"></div>

        <!-- Bottom Legend -->
        <div class="bottom-legend">
          <div class="legend-item" id="leg-active">
            <div class="legend-dot" style="background:#2563eb; border: 1px solid #60a5fa;"></div>
            <span>Active</span>
          </div>
          <div class="legend-item" id="leg-candidate">
            <div class="legend-dot" style="background:#d97706; border: 1px solid #fbbf24;"></div>
            <span>Candidate</span>
          </div>
          <div class="legend-item" id="leg-nonelected">
            <div class="legend-dot" style="background:#475569; border: 1px solid #94a3b8;"></div>
            <span>Non-elected</span>
          </div>
          <div class="legend-item" id="leg-leader">
            <div class="legend-dot" style="background:#059669; border: 1px solid #34d399;"></div>
            <span>Leader</span>
          </div>
          <div class="legend-item">
            <span style="display:inline-block;width:9px;height:9px;background:#ef4444;border-radius:2px;"></span>
            <span>Message Token</span>
          </div>
        </div>

        <!-- Node Inspector Drawer -->
        <div id="node-inspector">
          <div class="inspector-header">
            <div>
              <div class="inspector-title" id="insp-title">Node Inspector</div>
              <span class="inspector-badge" id="insp-badge">ACTIVE</span>
            </div>
            <button class="close-btn" id="btn-close-insp">✕</button>
          </div>
          <div id="insp-body"></div>
        </div>
      </div>

      <script>
        const nodesData = {nodes_json};
        const edgesData = {edges_json};
        const messagesData = {messages_json};
        const isFinished = {finished_flag};

        if (typeof vis === 'undefined') {{
          const container = document.getElementById('network-canvas');
          if (container) {{
            container.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#94a3b8;text-align:center;padding:24px;">
                <div style="font-weight:700;color:#f8fafc;font-size:16px;margin-bottom:8px;">Interactive Network Visualizer</div>
                <div style="font-size:13px;max-width:440px;line-height:1.6;color:#cbd5e1;">The interactive Vis.js canvas library is loading or offline. You can toggle to <b>Classic Plotly</b> above for offline graph rendering.</div>
              </div>
            `;
          }}
        }} else {{
        // Create Vis.js DataSets
        const visNodes = new vis.DataSet(nodesData.map(n => ({{
          id: n.id,
          label: n.label,
          x: n.x,
          y: n.y,
          shape: 'circle',
          size: n.size,
          color: n.color,
          borderWidth: n.borderWidth,
          font: {{
            color: '#ffffff',
            size: 13,
            face: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
            strokeWidth: 2,
            strokeColor: '#090d16'
          }}
        }})));

        const visEdges = new vis.DataSet(edgesData.map((e, idx) => ({{
          id: idx,
          from: e.from,
          to: e.to,
          arrows: e.arrows ? {{ to: {{ enabled: true, scaleFactor: 0.8 }} }} : false,
          color: e.color,
          width: e.width,
          smooth: false
        }})));

        const container = document.getElementById('network-canvas');
        const options = {{
          physics: {{ enabled: false }},
          interaction: {{
            hover: true,
            tooltipDelay: 120,
            zoomView: true,
            dragView: true,
            dragNodes: true
          }}
        }};

        const network = new vis.Network(container, {{ nodes: visNodes, edges: visEdges }}, options);

        let focusedNodeId = null;
        let isDelivering = false;
        let deliverStart = 0;
        const deliverDuration = 1200; // 1.2s single clean delivery animation

        // Apply node isolation / dimming
        function setIsolation(focusId) {{
          focusedNodeId = focusId;
          const banner = document.getElementById('isolation-banner');
          const bannerIdSpan = document.getElementById('isolated-node-id');

          if (focusId === null) {{
            banner.style.display = 'none';
            visNodes.update(nodesData.map(n => ({{
              id: n.id,
              color: n.color,
              font: {{ color: '#ffffff' }}
            }})));
            visEdges.update(edgesData.map((e, idx) => ({{
              id: idx,
              color: {{ color: '#475569' }},
              width: 2
            }})));
          }} else {{
            banner.style.display = 'flex';
            bannerIdSpan.textContent = focusId;
            const focusNode = nodesData.find(n => n.id === focusId);
            const activeSet = new Set([focusId, ...(focusNode ? focusNode.neighbors : [])]);

            visNodes.update(nodesData.map(n => {{
              if (activeSet.has(n.id)) {{
                return {{ id: n.id, color: n.color, font: {{ color: '#ffffff' }} }};
              }} else {{
                return {{
                  id: n.id,
                  color: {{ background: '#1e293b', border: '#334155' }},
                  font: {{ color: 'rgba(255,255,255,0.25)' }}
                }};
              }}
            }}));

            visEdges.update(edgesData.map((e, idx) => {{
              const isConnected = (e.from === focusId || e.to === focusId);
              return {{
                id: idx,
                color: isConnected ? {{ color: '#38bdf8' }} : {{ color: 'rgba(51, 65, 85, 0.2)' }},
                width: isConnected ? 3 : 1
              }};
            }}));
          }}
          network.redraw();
        }}

        // Canvas Drawing Hook: stationary badges OR single-shot delivery
        network.on("afterDrawing", function(ctx) {{
          const now = performance.now();
          let progress = 0.55; // default calm stationary position

          if (isDelivering) {{
            const elapsed = now - deliverStart;
            progress = Math.min(1.0, elapsed / deliverDuration);
            if (progress >= 1.0) {{
              isDelivering = false; // Stop! Never loops!
            }}
          }}

          // 1. Leader crown & subtle beacon
          nodesData.forEach(n => {{
            if (n.is_leader) {{
              const pos = network.getPosition(n.id);
              if (pos) {{
                ctx.save();
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 34, 0, 2 * Math.PI);
                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 3;
                ctx.stroke();

                ctx.font = 'bold 9px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const lText = 'LEADER';
                const lWidth = ctx.measureText(lText).width + 10;
                ctx.fillStyle = '#059669';
                ctx.beginPath();
                if (ctx.roundRect) {{
                  ctx.roundRect(pos.x - lWidth/2, pos.y - 36, lWidth, 14, 3);
                }} else {{
                  ctx.rect(pos.x - lWidth/2, pos.y - 36, lWidth, 14);
                }}
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillText(lText, pos.x, pos.y - 29);
                ctx.restore();
              }}
            }}
          }});

          // 2. Render calm, stationary message badges
          messagesData.forEach((msg) => {{
            // If isolation active, only show messages related to focused node
            if (focusedNodeId !== null && (msg.src !== focusedNodeId && msg.dst !== focusedNodeId)) {{
              return;
            }}

            const p1 = network.getPosition(msg.src);
            const p2 = network.getPosition(msg.dst);

            if (p1 && p2) {{
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist > 1) {{
                const curX = p1.x + progress * dx;
                const curY = p1.y + progress * dy;

                ctx.save();

                // Direction arrowhead along edge
                const angle = Math.atan2(dy, dx);
                ctx.beginPath();
                ctx.moveTo(curX + Math.cos(angle) * 7, curY + Math.sin(angle) * 7);
                ctx.lineTo(curX + Math.cos(angle + 2.4) * 6, curY + Math.sin(angle + 2.4) * 6);
                ctx.lineTo(curX + Math.cos(angle - 2.4) * 6, curY + Math.sin(angle - 2.4) * 6);
                ctx.closePath();
                ctx.fillStyle = msg.color || '#ef4444';
                ctx.fill();

                // Clean Message Pill
                const label = `${{msg.label || msg.kind}}`;
                ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const textWidth = ctx.measureText(label).width;

                const badgeW = textWidth + 14;
                const badgeH = 20;
                const badgeX = curX - badgeW / 2;
                const badgeY = curY - 20;

                // Badge Container
                ctx.fillStyle = '#0f172a';
                ctx.strokeStyle = msg.color || '#ef4444';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                if (ctx.roundRect) {{
                  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
                }} else {{
                  ctx.rect(badgeX, badgeY, badgeW, badgeH);
                }}
                ctx.fill();
                ctx.stroke();

                // Badge Text
                ctx.fillStyle = '#ffffff';
                ctx.fillText(label, curX, badgeY + badgeH / 2);

                ctx.restore();
              }}
            }}
          }});

          if (isDelivering) {{
            network.redraw();
          }}
        }});

        // Trigger single 1x delivery animation
        function triggerDelivery() {{
          isDelivering = true;
          deliverStart = performance.now();
          network.redraw();
        }}

        document.getElementById('btn-deliver').addEventListener('click', triggerDelivery);

        // Click-to-inspect & isolate handler
        const inspector = document.getElementById('node-inspector');
        const inspTitle = document.getElementById('insp-title');
        const inspBadge = document.getElementById('insp-badge');
        const inspBody = document.getElementById('insp-body');
        const btnCloseInsp = document.getElementById('btn-close-insp');

        function openInspector(nodeId) {{
          setIsolation(nodeId);
          const node = nodesData.find(n => n.id === nodeId);
          if (!node) return;

          inspTitle.innerHTML = (node.is_leader ? '<span style="color:#10b981;font-weight:700;">[LEADER]</span> ' : '') + `Node ${{node.id}} <span style="font-size:12px;color:#94a3b8;font-weight:normal;">(ID: ${{node.logical_id}})</span>`;
          inspBadge.textContent = node.badge;
          inspBadge.style.background = node.badge_bg;
          inspBadge.style.color = node.badge_color;

          let html = '';
          html += '<div class="section-label">Node Overview</div>';
          html += `<div class="kv-row"><span class="kv-key">Status:</span><span class="kv-val">${{node.status.toUpperCase()}}</span></div>`;
          html += `<div class="kv-row"><span class="kv-key">Assigned ID:</span><span class="kv-val">${{node.logical_id}}</span></div>`;
          html += `<div class="kv-row"><span class="kv-key">Neighbors (${{node.neighbors.length}}):</span><span class="kv-val">[${{node.neighbors.join(', ')}}]</span></div>`;

          html += '<div class="section-label">Local State Variables</div>';
          const stateKeys = Object.keys(node.state);
          if (stateKeys.length > 0) {{
            stateKeys.forEach(k => {{
              html += `<div class="kv-row"><span class="kv-key">${{k}}:</span><span class="kv-val">${{node.state[k]}}</span></div>`;
            }});
          }} else {{
            html += '<div class="hint-text">No custom state recorded for this algorithm</div>';
          }}

          html += '<div class="section-label">Outgoing Messages (In Transit)</div>';
          if (node.out_msgs.length > 0) {{
            node.out_msgs.forEach(m => {{
              html += `<div class="msg-chip" style="border-left-color:${{m.color}};">
                <strong>To Node ${{m.dst}}</strong>: ${{m.label}}<br>
                <span style="color:#94a3b8;font-size:10px;">Payload: ${{JSON.stringify(m.payload)}}</span>
              </div>`;
            }});
          }} else {{
            html += '<div class="hint-text">None sent this round</div>';
          }}

          html += '<div class="section-label">Incoming Messages</div>';
          if (node.in_msgs.length > 0) {{
            node.in_msgs.forEach(m => {{
              html += `<div class="msg-chip" style="border-left-color:${{m.color}};">
                <strong>From Node ${{m.src}}</strong>: ${{m.label}}<br>
                <span style="color:#94a3b8;font-size:10px;">Payload: ${{JSON.stringify(m.payload)}}</span>
              </div>`;
            }});
          }} else {{
            html += '<div class="hint-text">None incoming for next round</div>';
          }}

          inspBody.innerHTML = html;
          inspector.classList.add('open');
        }}

        function closeInspector() {{
          inspector.classList.remove('open');
          setIsolation(null);
        }}

        btnCloseInsp.addEventListener('click', closeInspector);
        document.getElementById('isolation-banner').addEventListener('click', closeInspector);
        document.getElementById('btn-clear-focus').addEventListener('click', closeInspector);

        network.on('click', function(params) {{
          if (params.nodes.length > 0) {{
            openInspector(params.nodes[0]);
          }} else {{
            closeInspector();
          }}
        }});

        document.getElementById('btn-fit').addEventListener('click', () => {{
          network.fit({{ animation: {{ duration: 500 }} }});
        }});

        // Legend Clicks
        document.getElementById('leg-leader').addEventListener('click', () => {{
          const leader = nodesData.find(n => n.is_leader);
          if (leader) openInspector(leader.id);
        }});

        document.getElementById('leg-active').addEventListener('click', () => {{
          const actives = nodesData.filter(n => n.status === 'active');
          if (actives.length) openInspector(actives[0].id);
        }});

        document.getElementById('leg-candidate').addEventListener('click', () => {{
          const candidates = nodesData.filter(n => n.status === 'candidate');
          if (candidates.length) openInspector(candidates[0].id);
        }});

        document.getElementById('leg-nonelected').addEventListener('click', () => {{
          const non = nodesData.filter(n => n.status === 'non-elected');
          if (non.length) openInspector(non[0].id);
        }});

        setTimeout(() => {{
          network.fit();
        }}, 80);
        }}
      </script>
    </body>
    </html>
    """

    components.html(html_code, height=height, scrolling=False)
