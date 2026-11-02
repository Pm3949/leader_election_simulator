import time, streamlit as st, networkx as nx, plotly.graph_objects as go, pandas as pd, random
from algorithms import ALGORITHMS
from core.engine import Simulator
from visualizer import render_visjs_network
from storyline import generate_round_storyline
st.set_page_config(page_title='Leader Election Lab',page_icon='🗳️',layout='wide')
st.title('🗳️ Distributed Leader Election Lab')
st.caption('Chapter 5 · Synchronous rounds · Network visualization + event trace')
with st.sidebar:
    st.header('Configuration'); alg_name=st.selectbox('Algorithm',list(ALGORITHMS)); alg=ALGORITHMS[alg_name]
    n=st.slider('Nodes',3,30,8); seed=st.number_input('Random seed',0,999999,7)
    id_mode=st.selectbox('IDs',['Sequential','Shuffled'])
    if alg.topology=='general': topo=st.selectbox('Topology',['Path','Cycle','Random connected','Grid-like'])
    else: topo=alg.topology
    st.caption(f'**Topology:** {alg.topology}\n\n**Bound:** {alg.complexity}')
    reset=st.button('Create / reset',type='primary',use_container_width=True)
def create_graph():
    if alg.topology=='ring': return nx.cycle_graph(n)
    if alg.topology=='complete': return nx.complete_graph(n)
    if topo=='Path': return nx.path_graph(n)
    if topo=='Cycle': return nx.cycle_graph(n)
    if topo=='Random connected': return nx.random_labeled_tree(n,seed=int(seed))
    g=nx.grid_2d_graph(max(2,int(n**.5)),max(2,int(n**.5))); g=nx.convert_node_labels_to_integers(g)
    for v in range(len(g),n): g.add_edge(v-1,v)
    return g.subgraph(range(n)).copy()

def compute_layout(graph, alg_topology, topo_name):
    if alg_topology == 'ring' or topo_name == 'Cycle':
        return nx.circular_layout(graph)
    if alg_topology == 'complete':
        return nx.circular_layout(graph)
    if topo_name == 'Path':
        nodes = list(graph.nodes)
        return {node: (float(i - len(nodes) / 2.0), 0.0) for i, node in enumerate(nodes)}
    if topo_name == 'Grid-like':
        try:
            return nx.spring_layout(graph, seed=int(seed), iterations=100)
        except Exception:
            return nx.circular_layout(graph)
    try:
        return nx.kamada_kawai_layout(graph)
    except Exception:
        return nx.spring_layout(graph, seed=int(seed))

def build_network_figure(sim, graph, ids, pos):
    edge_x, edge_y = [], []
    for u, v in graph.edges():
        edge_x += [float(pos[u][0]), float(pos[v][0]), None]
        edge_y += [float(pos[u][1]), float(pos[v][1]), None]

    edge_trace = go.Scatter(
        x=edge_x, y=edge_y,
        mode='lines',
        line=dict(color='#94a3b8', width=2),
        hoverinfo='none',
        showlegend=False
    )

    colors = {
        'active': '#3b82f6',
        'candidate': '#f59e0b',
        'non-elected': '#64748b',
        'elected': '#10b981'
    }

    node_x = [float(pos[v][0]) for v in sim.nodes]
    node_y = [float(pos[v][1]) for v in sim.nodes]
    node_colors = [colors.get(sim.nodes[v].status, '#3b82f6') for v in sim.nodes]
    node_border_colors = ['#fbbf24' if sim.nodes[v].status == 'elected' else '#ffffff' for v in sim.nodes]
    node_border_widths = [4 if sim.nodes[v].status == 'elected' else 2.5 for v in sim.nodes]
    node_sizes = [44 if sim.nodes[v].status == 'elected' else 36 for v in sim.nodes]

    node_labels = [f"👑 {ids[v]}" if sim.nodes[v].status == 'elected' else str(ids[v]) for v in sim.nodes]
    node_hover = [
        f"<b>Node {v}</b><br>ID: {ids[v]}<br>Status: <b>{sim.nodes[v].status.upper()}</b><br>State: {sim.nodes[v].state}"
        for v in sim.nodes
    ]

    node_trace = go.Scatter(
        x=node_x, y=node_y,
        mode='markers+text',
        text=node_labels,
        textposition='middle center',
        textfont=dict(color='white', size=13, family='Arial Black, sans-serif'),
        hovertext=node_hover,
        hoverinfo='text',
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=node_border_widths, color=node_border_colors)
        ),
        showlegend=False
    )

    sub_trace = go.Scatter(
        x=node_x,
        y=[y - 0.12 for y in node_y],
        mode='text',
        text=[f"👑 Leader (Node {v})" if sim.nodes[v].status == 'elected' else f"Node {v}" for v in sim.nodes],
        textposition='bottom center',
        textfont=dict(size=11, color='#64748b', family='sans-serif'),
        hoverinfo='none',
        showlegend=False
    )

    traces = [edge_trace, node_trace, sub_trace]
    annotations = []

    target_round = 1 if sim.round == 0 else (sim.round + 1)
    in_flight = sim.pending.get(target_round, [])

    msg_x, msg_y, msg_labels, msg_hover = [], [], [], []
    show_labels = len(in_flight) <= 24

    for src, dst, kind, p in in_flight:
        p_src = pos[src]
        p_dst = pos[dst]
        dx = float(p_dst[0] - p_src[0])
        dy = float(p_dst[1] - p_src[1])
        mx = float(p_src[0] + 0.55 * dx)
        my = float(p_src[1] + 0.55 * dy)

        val = p.get('token', p.get('value', p.get('node_id', p.get('rank', ''))))
        if isinstance(val, (tuple, list)):
            val = round(val[0], 2)
        lbl = f"✉ {val}" if val != '' else "✉"

        msg_x.append(mx)
        msg_y.append(my)
        msg_labels.append(lbl if show_labels else "")
        msg_hover.append(f"<b>In Flight: Node {src} ➔ Node {dst}</b><br>Type: {kind}<br>Payload: {p}")

        annotations.append(dict(
            x=float(p_dst[0] - 0.18 * dx),
            y=float(p_dst[1] - 0.18 * dy),
            ax=float(p_src[0] + 0.18 * dx),
            ay=float(p_src[1] + 0.18 * dy),
            xref='x', yref='y', axref='x', ayref='y',
            showarrow=True,
            arrowhead=3,
            arrowsize=1.4,
            arrowwidth=2.5,
            arrowcolor='#ef4444'
        ))

    if msg_x:
        msg_trace = go.Scatter(
            x=msg_x, y=msg_y,
            mode='markers+text' if show_labels else 'markers',
            text=msg_labels,
            textposition='top center',
            textfont=dict(color='#ef4444', size=11, family='Arial Black, sans-serif'),
            marker=dict(symbol='diamond', size=14, color='#ef4444', line=dict(width=1.5, color='#ffffff')),
            hovertext=msg_hover,
            hoverinfo='text',
            showlegend=False
        )
        traces.append(msg_trace)

    fig = go.Figure(traces)
    for a in annotations:
        fig.add_annotation(**a)

    xs = [float(p[0]) for p in pos.values()]
    ys = [float(p[1]) for p in pos.values()]
    pad_x = max(0.35, (max(xs) - min(xs)) * 0.15) if xs else 0.5
    pad_y = max(0.35, (max(ys) - min(ys)) * 0.15) if ys else 0.5

    fig.update_layout(
        height=480,
        margin=dict(l=25, r=25, t=25, b=25),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[min(xs) - pad_x, max(xs) + pad_x]),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[min(ys) - pad_y, max(ys) + pad_y]),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)'
    )
    return fig, in_flight

if reset or 'sim' not in st.session_state or st.session_state.get('alg')!=alg_name:
    graph=create_graph(); vals=list(range(1,n+1))
    if id_mode=='Shuffled': random.Random(int(seed)).shuffle(vals)
    ids=dict(zip(graph.nodes,vals)); st.session_state.graph=graph; st.session_state.ids=ids
    st.session_state.sim=Simulator(graph,alg,ids,int(seed)); st.session_state.alg=alg_name
    st.session_state.running=False
    st.session_state.pos = compute_layout(graph, alg.topology, topo if alg.topology=='general' else alg.topology)

if 'pos' not in st.session_state:
    st.session_state.pos = compute_layout(st.session_state.graph, alg.topology, topo if alg.topology=='general' else alg.topology)

sim=st.session_state.sim
c=st.columns(4)
sim_status = 'Finished' if sim.finished else ('Running' if st.session_state.get('running') else ('Paused' if sim.round > 0 else 'Ready'))
for col,label,value in zip(c,['Round','Messages','Nodes','State'],[sim.round,sim.message_count,len(sim.nodes),sim_status]): col.metric(label,value)
left,right=st.columns([1.4,1])

fig, in_flight = build_network_figure(sim, st.session_state.graph, st.session_state.ids, st.session_state.pos)

with left:
    head_col1, head_col2 = st.columns([1.1, 1])
    with head_col1:
        st.subheader('Network Visualization')
    with head_col2:
        viz_mode = st.radio(
            'Visual Mode',
            ['🚀 Interactive (Drag, Packets, Inspect)', '📊 Classic Plotly'],
            horizontal=True,
            label_visibility='collapsed'
        )

    if viz_mode.startswith('🚀'):
        render_visjs_network(sim, st.session_state.graph, st.session_state.ids, st.session_state.pos, height=520)
    else:
        st.markdown(
            '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;margin-bottom:8px;">'
            '<span><span style="color:#3b82f6;font-size:16px;">●</span> Active</span>'
            '<span><span style="color:#f59e0b;font-size:16px;">●</span> Candidate</span>'
            '<span><span style="color:#64748b;font-size:16px;">●</span> Non-elected</span>'
            '<span><span style="color:#10b981;font-size:16px;">●</span> Elected Leader 👑</span>'
            '<span><span style="color:#ef4444;font-size:16px;">◆</span> In-flight Message</span>'
            '</div>',
            unsafe_allow_html=True
        )
        st.plotly_chart(fig, use_container_width=True)

    storyline_items = generate_round_storyline(sim, st.session_state.ids)
    with st.expander(f"📖 Round {sim.round} Storyline & Decisions ({len(storyline_items)} events)", expanded=True):
        for item in storyline_items:
            st.markdown(
                f"""<div style="background:rgba(255,255,255,0.04); border-left: 4px solid {item['badge_color']}; padding: 9px 12px; border-radius: 6px; margin-bottom: 7px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 3px;">
                        <span style="font-weight:700; font-size:13px; color:#f8fafc;">{item['icon']} {item['title']}</span>
                        <span style="background:{item['badge_color']}25; color:{item['badge_color']}; font-size:10px; font-weight:700; padding:2px 7px; border-radius:10px; border:1px solid {item['badge_color']}50;">{item['badge']}</span>
                    </div>
                    <div style="font-size:12px; color:#cbd5e1; line-height:1.4;">{item['detail']}</div>
                </div>""",
                unsafe_allow_html=True
            )

    with st.expander(f"📡 Messages In Transit (Round {sim.round})", expanded=False):
        if in_flight:
            st.markdown(f"**📬 {len(in_flight)} Message(s) Queued for Next Round:**")
            msg_cols = st.columns(min(3, len(in_flight)))
            for idx, (src, dst, kind, p) in enumerate(in_flight):
                with msg_cols[idx % len(msg_cols)]:
                    val = p.get('token', p.get('value', p.get('node_id', p.get('rank', ''))))
                    st.caption(f"**Node {src} ➔ Node {dst}**\n`{kind}` ({val})")
        elif sim.finished:
            st.success(f"🎉 Election Complete! Leader elected: **Node {sim.result_data.get('leaders')}**")
        else:
            st.info("No active messages in transit.")
with right:
    st.subheader('Execution controls'); st.write(alg.description)
    step_delay = st.slider('Step delay (seconds)', min_value=0.5, max_value=5.0, value=2.0, step=0.5)
    a,b=st.columns(2)
    is_running = st.session_state.get('running', False)
    if is_running:
        if a.button('⏸ Pause', use_container_width=True):
            st.session_state.running = False
            st.rerun()
    else:
        if a.button('▶ Run', disabled=sim.finished, use_container_width=True):
            st.session_state.running = True
            st.rerun()
    if b.button('Step round', disabled=sim.finished or is_running, use_container_width=True):
        sim.step()
        st.rerun()
    c1,c2=st.columns(2)
    if c1.button('⚡ Fast-forward', disabled=sim.finished, use_container_width=True):
        st.session_state.running = False
        sim.run()
        st.rerun()
    if c2.button('Reset simulation', use_container_width=True):
        st.session_state.running = False
        st.session_state.pop('sim', None)
        st.rerun()
    if sim.finished:
        st.session_state.running = False
        st.success(f"Leader: {sim.result_data.get('leaders')}"); st.json(sim.result_data)
st.subheader('Node state')
st.dataframe(pd.DataFrame([{'Node':v,'ID':st.session_state.ids[v],'Status':node.status,**node.state} for v,node in sim.nodes.items()]),use_container_width=True,hide_index=True)
st.subheader('Message and event log')
df=pd.DataFrame([e.__dict__ for e in sim.events])
if not df.empty:
    f1,f2=st.columns(2)
    with f1: rf=st.selectbox('Round',['All']+sorted(df['round'].unique().tolist()))
    with f2: ef=st.selectbox('Event',['All']+sorted(df['event'].unique().tolist()))
    if rf!='All': df=df[df['round']==rf]
    if ef!='All': df=df[df['event']==ef]
    st.dataframe(df.iloc[::-1],use_container_width=True,hide_index=True)
    st.download_button('Export CSV',df.to_csv(index=False),'events.csv','text/csv')

if st.session_state.get('running', False):
    if not sim.finished:
        time.sleep(step_delay)
        sim.step()
        st.rerun()
    else:
        st.session_state.running = False
        st.rerun()
