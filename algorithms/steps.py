"""
Detailed step-by-step specifications, protocol rules, and invariants
for all distributed leader election algorithms.
"""

ALGORITHM_STEPS = {
    "BasicLE-Ring": {
        "title": "BasicLE-Ring (LCR Algorithm — LeLann, Chang & Roberts)",
        "topology": "Unidirectional Ring",
        "complexity": "Time: O(n) rounds | Messages: O(n²) worst-case, O(n log n) average",
        "objective": "Elect a unique leader among n nodes arranged in a unidirectional ring with unique IDs.",
        "summary": "Every node sends its own ID clockwise around the ring. Nodes only forward IDs that are smaller than their own ID (or larger in max-ID variants). A token that travels the entire ring without being dropped returns to its originator, which elects itself leader.",
        "steps": [
            {
                "step_number": 1,
                "title": "Initialization (Round 0)",
                "tag": "INIT",
                "content": "Every node <code>v</code> starts in the <code>active</code> state. Each node sends an <code>ID_TOKEN</code> containing its own unique ID to its immediate clockwise neighbor: <code>(v + 1) mod n</code>."
            },
            {
                "step_number": 2,
                "title": "Token Receipt & Comparison (Rounds 1 to n)",
                "tag": "FILTER",
                "content": "In each synchronous round, node <code>v</code> receives an incoming <code>ID_TOKEN</code> with value <code>token</code> from its counter-clockwise neighbor and compares it with its own <code>ID_v</code>:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li><b>Case A (Smaller Token, <code>token < ID_v</code>):</b> The incoming candidate has a smaller ID than node <code>v</code>. Node <code>v</code> yields, changes its status to <code>non-elected</code>, and forwards the token clockwise to <code>(v + 1) mod n</code>.</li>"
                           "<li><b>Case B (Larger Token, <code>token > ID_v</code>):</b> The incoming candidate has a higher ID than node <code>v</code>. Node <code>v</code> swallows and discards the token (<code>TOKEN DISCARDED</code>). It is impossible for this larger ID to win.</li>"
                           "<li><b>Case C (Own Token Returns, <code>token == ID_v</code>):</b> The token has traveled the entire ring of <code>n</code> nodes without ever being dropped. This proves no smaller ID exists anywhere in the ring.</li>"
                           "</ul>"
            },
            {
                "step_number": 3,
                "title": "Leader Declaration & Termination",
                "tag": "ELECT",
                "content": "The node whose own token returns marks its status as <code>elected</code> (Leader). All other nodes remain <code>non-elected</code>. The election completes in exactly <code>n</code> rounds."
            },
            {
                "step_number": 4,
                "title": "Correctness & Complexity",
                "tag": "BOUNDS",
                "content": "<b>Safety:</b> Exactly one node has the minimum ID, so exactly one token survives the full ring.<br>"
                           "<b>Liveness:</b> The minimal ID token is never dropped and completes the ring in <code>n</code> rounds.<br>"
                           "<b>Worst Case:</b> If IDs are in reverse order, IDs travel 1, 2, ..., n hops, consuming <code>n(n+1)/2 = O(n²)</code> messages."
            }
        ]
    },

    "ImprovedLE-Ring": {
        "title": "ImprovedLE-Ring (Hirschberg-Sinclair / HS Algorithm)",
        "topology": "Bidirectional Ring",
        "complexity": "Time: O(n) rounds | Messages: O(n log n) worst-case",
        "objective": "Achieve O(n log n) worst-case message complexity on a bidirectional ring using phased distance-doubling probes.",
        "summary": "Execution proceeds in discrete phases k = 0, 1, 2, ... In phase k, active candidates send probe tokens up to distance 2^k in both directions. Only candidates whose probes return from both directions without being blocked by a smaller ID survive to phase k+1.",
        "steps": [
            {
                "step_number": 1,
                "title": "Phase 0 Initialization",
                "tag": "INIT",
                "content": "All nodes begin as <code>candidate</code>s in phase <code>k = 0</code>. The probe distance is <code>dist = 2^0 = 1</code> hop. Each active candidate sends a <code>PROBE</code> message carrying its ID in <b>both</b> directions (clockwise +1 and counter-clockwise -1) with <code>remaining = 0</code> hops."
            },
            {
                "step_number": 2,
                "title": "Probe Forwarding & Turnaround",
                "tag": "PROBE",
                "content": "When node <code>v</code> receives a <code>PROBE</code> token originating from <code>origin</code>:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li><b>If <code>ID_v < token</code>:</b> Node <code>v</code> has a smaller ID, so it blocks and discards the probe (<code>PROBE BLOCKED</code>).</li>"
                           "<li><b>If <code>ID_v >= token</code> and <code>remaining == 0</code>:</b> The probe reached its phase distance without encountering a smaller ID. Node <code>v</code> generates a <code>RETURN</code> token directly back to <code>origin</code>.</li>"
                           "<li><b>If <code>ID_v >= token</code> and <code>remaining > 0</code>:</b> Node <code>v</code> forwards the <code>PROBE</code> along the same direction with <code>remaining - 1</code>.</li>"
                           "</ul>"
            },
            {
                "step_number": 3,
                "title": "Phase Barrier & Survival Filter",
                "tag": "BARRIER",
                "content": "A candidate waits up to <code>2 × 2^k</code> rounds for its probes to return:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li>If <code>RETURN</code> tokens arrive from <b>both</b> clockwise (+1) and counter-clockwise (-1) directions, the node survives and advances to Phase <code>k + 1</code> with doubled distance <code>2^(k+1)</code>.</li>"
                           "<li>If either probe was blocked, the candidate is eliminated (<code>NODE ELIMINATED</code>) and becomes a passive forwarder for future phases.</li>"
                           "</ul>"
            },
            {
                "step_number": 4,
                "title": "Leader Election & Termination",
                "tag": "ELECT",
                "content": "Distance doubling continues until <code>2^k >= n</code> (at phase <code>⌈log₂ n⌉</code>). Only the node with the globally minimum ID receives returns from both directions across the whole ring. It declares itself <code>elected</code> (Leader)."
            }
        ]
    },

    "RandLE-Ring": {
        "title": "RandLE-Ring (Randomized Ring Algorithm — Itai & Rodeh)",
        "topology": "Unidirectional Ring",
        "complexity": "Time: O(n) rounds | Messages: Expected O(n log n)",
        "objective": "Break ring symmetry efficiently by drawing independent uniform random priorities.",
        "summary": "Each node draws an independent random real rank r in [0, 1) and forms the composite key (r, ID). Tokens circulate clockwise and are forwarded only if lexicographically smaller than the receiver's key.",
        "steps": [
            {
                "step_number": 1,
                "title": "Random Rank Generation",
                "tag": "RANDOM",
                "content": "Each node <code>v</code> samples an independent continuous random variable <code>r_v ∈ [0, 1)</code>. It constructs a unique lexicographical key <code>key_v = (r_v, ID_v)</code> and sends a <code>RANK_TOKEN</code> to its clockwise neighbor <code>(v + 1) mod n</code>."
            },
            {
                "step_number": 2,
                "title": "Lexicographic Filtering",
                "tag": "FILTER",
                "content": "When node <code>v</code> receives <code>RANK_TOKEN</code> with <code>key_token</code>:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li><b>If <code>key_token < key_v</code>:</b> The incoming key has higher priority (smaller value). Node <code>v</code> transitions to <code>non-elected</code> and forwards the token clockwise.</li>"
                           "<li><b>If <code>key_token >= key_v</code>:</b> Node <code>v</code> discards the token (<code>TOKEN DISCARDED</code>).</li>"
                           "<li><b>If <code>origin == v</code>:</b> The token circled the entire ring unimpeded.</li>"
                           "</ul>"
            },
            {
                "step_number": 3,
                "title": "Leader Declaration",
                "tag": "ELECT",
                "content": "The node whose random priority key completes the full circular traversal elects itself <code>elected</code> (Leader). All other nodes transition to <code>non-elected</code>."
            },
            {
                "step_number": 4,
                "title": "Expected Message Complexity",
                "tag": "BOUNDS",
                "content": "Continuous random ranks ensure the permutation of candidate ranks is uniformly distributed with probability 1. The expected number of surviving tokens after <code>k</code> hops matches harmonic sum analysis, achieving <code>E[Messages] = O(n log n)</code>."
            }
        ]
    },

    "SimpleLE-CN": {
        "title": "SimpleLE-CN (All-to-All Broadcast on Complete Networks)",
        "topology": "Complete Network (K_n)",
        "complexity": "Time: Exactly 1 round | Messages: Θ(n²) [n(n - 1) messages]",
        "objective": "Elect a unique leader in a single synchronous round on an all-to-all connected network.",
        "summary": "Every node broadcasts its ID to all other nodes in Round 1. After receiving messages from all peers, each node computes the global minimum. The node holding the minimum ID elects itself leader.",
        "steps": [
            {
                "step_number": 1,
                "title": "Full Mesh Broadcast (Round 0 / Start)",
                "tag": "BCAST",
                "content": "Every node <code>v</code> sends an <code>ID_BROADCAST</code> packet containing its unique <code>ID_v</code> to all other <code>n - 1</code> nodes in the network simultaneously (total of <code>n(n - 1)</code> messages in transit)."
            },
            {
                "step_number": 2,
                "title": "Message Collection (Round 1)",
                "tag": "INBOX",
                "content": "At the start of Round 1, each node <code>v</code> receives the <code>n - 1</code> broadcast messages from all peers and determines the global minimum ID: <code>min_id = min(all received IDs + own ID)</code>."
            },
            {
                "step_number": 3,
                "title": "Deterministic Local Decision",
                "tag": "ELECT",
                "content": "Each node evaluates its own ID against the observed minimum:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li>If <code>ID_v == min_id</code>: Node <code>v</code> elects itself as <code>elected</code> (Leader).</li>"
                           "<li>If <code>ID_v > min_id</code>: Node <code>v</code> becomes <code>non-elected</code>.</li>"
                           "</ul>"
            },
            {
                "step_number": 4,
                "title": "Tradeoff: Minimum Latency vs Message Volume",
                "tag": "TRADE-OFF",
                "content": "This algorithm achieves optimal time (1 round) but pays a quadratic message cost <code>Θ(n²)</code>. For large <code>n</code>, randomized protocols (like RandLE-CN) reduce this traffic to sublinear."
            }
        ]
    },

    "RandLE-CN": {
        "title": "RandLE-CN (Sublinear Randomized Complete Network Election)",
        "topology": "Complete Network (K_n)",
        "complexity": "Time: O(1) rounds w.h.p. | Messages: O(√n log^(3/2) n) w.h.p.",
        "objective": "Break the Ω(n²) complete network message barrier by randomly sampling candidates and referees.",
        "summary": "Only a small subset of nodes (≈ 2 ln n) sample themselves as candidates with probability p = 2 ln(n)/n. Each candidate samples k ≈ 2√(n ln n) random referees to vote on their random ranks. The candidate winning all its referee contests is elected leader.",
        "steps": [
            {
                "step_number": 1,
                "title": "Candidate Sampling (Bernoulli Trials)",
                "tag": "SAMPLE",
                "content": "Each node independently flips a biased coin with probability <code>p = min(1, 2 ln(n) / n)</code>:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li>Nodes that succeed become <code>candidate</code>s (expected count ≈ <code>2 ln n</code>).</li>"
                           "<li>Nodes that fail become <code>non-elected</code> immediately.</li>"
                           "</ul>"
            },
            {
                "step_number": 2,
                "title": "Referee Sampling & Rank Transmission (Round 0)",
                "tag": "REFEREES",
                "content": "Each active candidate picks a random rank from <code>[1, n⁴]</code> and selects <code>k = ⌈2√(n ln n)⌉</code> random nodes with replacement to serve as <b>referees</b>. The candidate sends <code>CANDIDATE_RANK</code> to each chosen referee."
            },
            {
                "step_number": 3,
                "title": "Referee Tournament & Feedback (Round 1)",
                "tag": "VOTE",
                "content": "Each referee <code>r</code> collects rank messages from all candidates that contacted it. It sends a <code>REFEREE_WIN</code> vote back <b>only to the candidate with the highest rank</b>."
            },
            {
                "step_number": 4,
                "title": "Tally & Leader Election (Round 2)",
                "tag": "ELECT",
                "content": "Each candidate counts the <code>REFEREE_WIN</code> votes it receives:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li>If a candidate wins all <code>expected[c]</code> referee contests, it claims victory and becomes <code>elected</code> (Leader).</li>"
                           "<li>Birthday paradox analysis guarantees that referee sets of competing candidates intersect with high probability, ensuring a unique winner.</li>"
                           "</ul>"
            }
        ]
    },

    "BasicLE-Gen": {
        "title": "BasicLE-Gen (Diameter Flooding / Min-Propagation on General Graphs)",
        "topology": "General Connected Graph (Any Topology)",
        "complexity": "Time: Exactly D rounds | Messages: O(D · |E|) worst-case",
        "objective": "Elect a unique leader on any arbitrary connected graph of diameter D without global routing tables.",
        "summary": "Nodes propagate their minimum known ID to all direct neighbors whenever their local minimum improves. Within D synchronous rounds (the graph diameter), the globally smallest ID reaches every node, allowing all nodes to agree on the leader.",
        "steps": [
            {
                "step_number": 1,
                "title": "Initialization (Round 0)",
                "tag": "INIT",
                "content": "Each node <code>v</code> initializes its local best value: <code>val_v = ID_v</code>. It broadcasts a <code>MIN_UPDATE(value = ID_v)</code> to all of its immediate graph neighbors <code>N(v)</code>."
            },
            {
                "step_number": 2,
                "title": "Relaxation & Flooding (Rounds 1 to D)",
                "tag": "FLOOD",
                "content": "In each synchronous round:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li>Node <code>v</code> inspects all incoming <code>MIN_UPDATE</code> messages and finds the minimum received value <code>best</code>.</li>"
                           "<li><b>If <code>best < val_v</code>:</b> Node <code>v</code> adopts the smaller ID (<code>val_v = best</code>) and immediately floods the improved minimum to all its neighbors.</li>"
                           "<li><b>If <code>best >= val_v</code>:</b> The node's state is unchanged and no new message is sent across incident edges.</li>"
                           "</ul>"
            },
            {
                "step_number": 3,
                "title": "Diameter Convergence & Leader Election",
                "tag": "CONVERGE",
                "content": "Because the maximum distance between any pair of nodes is the graph diameter <code>D = diameter(G)</code>, by round <code>D</code> every node in the graph holds the globally minimum ID. At round <code>D</code>:"
                           "<ul style='margin-top:4px; margin-left:18px;'>"
                           "<li>The node whose initial ID equals the converged minimum declares itself <code>elected</code> (Leader).</li>"
                           "<li>All other nodes mark themselves <code>non-elected</code>.</li>"
                           "</ul>"
            },
            {
                "step_number": 4,
                "title": "Topology Flexibility",
                "tag": "TOPOLOGY",
                "content": "Works on <b>any</b> connected graph (Trees, Paths, Cycles, Grids, Random Graphs). Message count depends on edge density: sparse trees consume far fewer messages than dense mesh topologies."
            }
        ]
    },

    "RandLE-Gen": {
        "title": "RandLE-Gen (Randomized Flooding on General Graphs)",
        "topology": "General Connected Graph (Any Topology)",
        "complexity": "Time: D deterministic rounds | Messages: Expected O(|E| · min{log n, D})",
        "objective": "Break symmetry and minimize message propagation on general topologies using randomized ranks.",
        "summary": "Nodes pick uniform random priorities r in [0, 1) and flood improving ranks across edges. After D rounds, the node holding the globally minimum random rank is universally acknowledged as leader.",
        "steps": [
            {
                "step_number": 1,
                "title": "Random Priority Initialization",
                "tag": "RANDOM",
                "content": "Every node <code>v</code> draws an independent continuous random priority <code>r_v ∈ [0, 1)</code>. It dispatches a <code>RANK_UPDATE(value = r_v)</code> to all adjacent neighbors."
            },
            {
                "step_number": 2,
                "title": "Iterative Rank Flooding",
                "tag": "FLOOD",
                "content": "Nodes update their stored rank whenever an incoming packet carries a strictly smaller value. Only improvements trigger downstream re-transmissions along graph edges, naturally choking duplicate or unhelpful traffic."
            },
            {
                "step_number": 3,
                "title": "Agreement at Round D",
                "tag": "ELECT",
                "content": "After <code>D = diameter(G)</code> rounds, information has diffused across the full network diameter. The node that originally generated the winning minimal rank elects itself <code>elected</code> (Leader)."
            },
            {
                "step_number": 4,
                "title": "Message Savings via Random Order",
                "tag": "BOUNDS",
                "content": "Because ranks are drawn uniformly at random, intermediate nodes discard larger ranks early. Over random graphs, expected message complexity scales as <code>O(|E| · min{log n, D})</code>."
            }
        ]
    }
}
