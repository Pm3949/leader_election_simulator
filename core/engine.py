from collections import defaultdict
from dataclasses import dataclass, field

@dataclass
class Node:
    node_id: int
    status: str = "active"
    state: dict = field(default_factory=dict)
    inbox: list = field(default_factory=list)

@dataclass
class Event:
    round: int
    event: str
    src: int | None = None
    dst: int | None = None
    details: str = ""
    kind: str = "info"

class Simulator:
    def __init__(self, graph, algorithm, ids, seed=7):
        self.graph, self.algorithm, self.ids = graph.copy(), algorithm, ids
        self.nodes = {v: Node(v) for v in graph.nodes}
        self.round, self.message_count, self.finished = 0, 0, False
        self.pending, self.events, self.result_data = defaultdict(list), [], {}
        algorithm.initialize(self, seed)
        self.log("INITIALIZED", details=f"{algorithm.name}; {len(self.nodes)} nodes")

    def log(self, event, src=None, dst=None, details="", kind="info"):
        self.events.append(Event(self.round, event, src, dst, details, kind))

    def send(self, src, dst, kind, **payload):
        self.pending[self.round + 1].append((src, dst, kind, payload))
        self.message_count += 1
        self.log("SEND", src, dst, f"{kind}: {payload}", "message")

    def step(self):
        if self.finished: return
        self.round += 1
        for src, dst, kind, payload in self.pending.pop(self.round, []):
            self.nodes[dst].inbox.append((src, kind, payload))
            self.log("RECEIVE", src, dst, f"{kind}: {payload}", "receive")
        self.algorithm.step(self)
        if self.algorithm.finished(self):
            self.finished = True
            self.result_data = self.algorithm.result(self)
            self.log("FINISHED", details=str(self.result_data), kind="success")

    def run(self, limit=1000):
        while not self.finished and self.round < limit: self.step()
        if not self.finished: self.log("ROUND LIMIT", details=f"Stopped at {limit}", kind="warning")
