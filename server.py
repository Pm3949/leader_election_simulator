import math
import random
import os
import networkx as nx
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from algorithms import ALGORITHMS
from algorithms.steps import ALGORITHM_STEPS
from core.engine import Simulator
from storyline import generate_round_storyline

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

app = FastAPI(title="Distributed Leader Election Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "Distributed Leader Election Simulator API"}

@app.get("/api/health")
def api_health():
    return {"status": "ok", "service": "Distributed Leader Election Simulator API"}

class SimRequest(BaseModel):
    algorithm: str
    nodes: int = 8
    seed: int = 7
    id_mode: str = "Sequential"  # "Sequential" or "Shuffled"
    topology: str = "Ring"       # "Path", "Cycle", "Random connected", "Grid-like", or algorithm's default

def create_network_graph(alg_topology: str, n: int, topo_choice: str, seed: int) -> nx.Graph:
    if alg_topology == 'ring':
        return nx.cycle_graph(n)
    if alg_topology == 'complete':
        return nx.complete_graph(n)
    if topo_choice == 'Path':
        return nx.path_graph(n)
    if topo_choice == 'Cycle':
        return nx.cycle_graph(n)
    if topo_choice == 'Random connected':
        return nx.random_labeled_tree(n, seed=seed)
    # Grid-like
    g = nx.grid_2d_graph(max(2, int(n**0.5)), max(2, int(n**0.5)))
    g = nx.convert_node_labels_to_integers(g)
    for v in range(len(g), n):
        g.add_edge(v - 1, v)
    return g.subgraph(range(n)).copy()

def compute_node_positions(graph: nx.Graph, alg_topology: str, topo_choice: str, seed: int) -> Dict[int, List[float]]:
    n = len(graph.nodes)
    if alg_topology == 'ring' or topo_choice == 'Cycle':
        pos = nx.circular_layout(graph)
    elif alg_topology == 'complete':
        pos = nx.circular_layout(graph)
    elif topo_choice == 'Path':
        nodes = list(graph.nodes)
        pos = {node: [float(i - (n - 1) / 2.0), 0.0] for i, node in enumerate(nodes)}
    elif topo_choice == 'Grid-like':
        try:
            pos = nx.spring_layout(graph, seed=seed, iterations=80)
        except Exception:
            pos = nx.circular_layout(graph)
    else:
        try:
            pos = nx.spring_layout(graph, seed=seed, iterations=80)
        except Exception:
            pos = nx.circular_layout(graph)

    # Normalize pos to a 0..1 bounding box or centered box with padding
    xs = [float(p[0]) for p in pos.values()]
    ys = [float(p[1]) for p in pos.values()]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    span_x = max(max_x - min_x, 1e-5)
    span_y = max(max_y - min_y, 1e-5)

    norm_pos = {}
    for node, p in pos.items():
        norm_pos[node] = [
            round((float(p[0]) - min_x) / span_x, 4),
            round((float(p[1]) - min_y) / span_y, 4)
        ]
    return norm_pos

@app.get("/api/algorithms")
def get_algorithms():
    result = []
    for name, alg in ALGORITHMS.items():
        steps_info = ALGORITHM_STEPS.get(name, {})
        result.append({
            "name": name,
            "topology": alg.topology,
            "complexity": alg.complexity,
            "description": alg.description,
            "steps": steps_info.get("steps", []),
            "title": steps_info.get("title", name),
            "summary": steps_info.get("summary", alg.description),
        })
    return result

@app.post("/api/simulate")
def run_simulation(req: SimRequest):
    if req.algorithm not in ALGORITHMS:
        raise HTTPException(status_code=400, detail=f"Algorithm '{req.algorithm}' not found")
    
    n = max(3, min(req.nodes, 30))
    alg = ALGORITHMS[req.algorithm]
    graph = create_network_graph(alg.topology, n, req.topology, req.seed)
    
    vals = list(range(1, n + 1))
    if req.id_mode == "Shuffled":
        random.Random(req.seed).shuffle(vals)
    ids = dict(zip(graph.nodes, vals))
    
    pos = compute_node_positions(graph, alg.topology, req.topology, req.seed)
    
    sim = Simulator(graph, alg, ids, req.seed)
    
    # We will record snapshot of each round
    snapshots = []
    
    # Helper to serialize messages
    def serialize_messages(msg_list):
        serialized = []
        for idx, (src, dst, kind, payload) in enumerate(msg_list):
            label, color = get_message_display_info(kind, payload)
            clean_payload = {}
            for k, v in payload.items():
                if isinstance(v, (int, float, str, bool, list, tuple)):
                    clean_payload[k] = v
                else:
                    clean_payload[k] = str(v)
            serialized.append({
                "id": f"msg_{src}_{dst}_{kind}_{idx}",
                "src": src,
                "dst": dst,
                "kind": kind,
                "payload": clean_payload,
                "label": label,
                "color": color
            })
        return serialized

    def record_snapshot():
        target_round = 1 if sim.round == 0 else (sim.round + 1)
        in_flight = sim.pending.get(target_round, [])
        storylines = generate_round_storyline(sim, ids)
        
        node_states = {}
        for v, node in sim.nodes.items():
            clean_state = {}
            for sk, sv in node.state.items():
                if isinstance(sv, (int, float, str, bool, list, tuple)):
                    clean_state[sk] = sv
                else:
                    clean_state[sk] = str(sv)
            node_states[v] = {
                "id": ids[v],
                "status": node.status,
                "state": clean_state,
                "inbox_count": len(node.inbox)
            }
            
        round_events = []
        for ev in sim.events:
            if ev.round == sim.round:
                round_events.append({
                    "round": ev.round,
                    "event": ev.event,
                    "src": ev.src,
                    "dst": ev.dst,
                    "details": ev.details,
                    "kind": ev.kind
                })

        snapshots.append({
            "round": sim.round,
            "message_count": sim.message_count,
            "finished": sim.finished,
            "leaders": sim.result_data.get("leaders", []) if sim.finished else [],
            "result_data": sim.result_data if sim.finished else {},
            "nodes": node_states,
            "in_flight": serialize_messages(in_flight),
            "storylines": storylines,
            "events": round_events
        })

    # Record round 0 (Initial state)
    record_snapshot()
    
    # Step through until finished or 300 round limit
    step_limit = 300
    while not sim.finished and sim.round < step_limit:
        sim.step()
        record_snapshot()

    # Edges list for rendering
    edges = [{"source": int(u), "target": int(v)} for u, v in graph.edges()]
    
    # Nodes list
    nodes_info = [
        {
            "node_id": int(v),
            "id_value": int(ids[v]),
            "x": pos[v][0],
            "y": pos[v][1]
        }
        for v in graph.nodes
    ]

    return {
        "algorithm": {
            "name": alg.name,
            "topology": alg.topology,
            "complexity": alg.complexity,
            "description": alg.description,
            "steps": ALGORITHM_STEPS.get(alg.name, {}).get("steps", [])
        },
        "graph": {
            "nodes": nodes_info,
            "edges": edges,
            "topology": req.topology if alg.topology == 'general' else alg.topology
        },
        "rounds": snapshots,
        "total_rounds": len(snapshots) - 1,
        "final_leader": sim.result_data.get("leaders", []) if sim.finished else [],
        "total_messages": sim.message_count
    }

# Mount static frontend build if it exists
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
