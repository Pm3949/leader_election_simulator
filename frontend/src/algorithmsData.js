// Standalone algorithm definitions and formal protocol invariants
export const DEFAULT_ALGORITHMS = [
  {
    name: "BasicLE-Ring",
    topology: "ring",
    complexity: "O(n) rounds; O(n²) worst-case messages.",
    description: "IDs circulate clockwise; a node forwards only a smaller ID. A token returning to its origin elects that node.",
    title: "BasicLE-Ring (LCR Algorithm — LeLann, Chang & Roberts)",
    summary: "Every node sends its own ID clockwise around the ring. Nodes only forward IDs that are smaller than their own. A token that returns to its originator elects that node.",
    steps: [
      {
        step_number: 1,
        title: "Initialization (Round 0)",
        tag: "INIT",
        content: "Every node v starts in the active state and sends an ID_TOKEN with its ID to (v + 1) mod n."
      },
      {
        step_number: 2,
        title: "Token Receipt & Filtering (Rounds 1 to n)",
        tag: "FILTER",
        content: "If incoming ID is smaller than receiver ID, forward it clockwise. If larger, drop it. If own ID returns, declare leader."
      },
      {
        step_number: 3,
        title: "Termination",
        tag: "ELECT",
        content: "The minimal ID node completes the full circle in exactly n rounds and elects itself leader."
      }
    ]
  },
  {
    name: "ImprovedLE-Ring",
    topology: "ring",
    complexity: "O(n) rounds; O(n log n) messages.",
    description: "Bidirectional phased elimination. In phase i, active nodes probe up to 2^i hops in both directions and survive only if both probes return.",
    title: "ImprovedLE-Ring (Hirschberg-Sinclair / HS Algorithm)",
    summary: "Doubling probe distance phase-by-phase (1, 2, 4, 8, ... hops). Only candidates smaller than all nodes in their 2^k neighborhood survive.",
    steps: [
      {
        step_number: 1,
        title: "Phase k Probes",
        tag: "PROBE",
        content: "In phase k, active nodes send PROBE messages distance 2^k in both clockwise and counter-clockwise directions."
      },
      {
        step_number: 2,
        title: "Return Acknowledgement",
        tag: "RETURN",
        content: "Nodes at boundary echo RETURN messages back if the probe ID is strictly smaller than intermediate nodes."
      },
      {
        step_number: 3,
        title: "Phase Advance",
        tag: "ADVANCE",
        content: "A candidate advances to phase k+1 only if both probes return successfully. Halves active candidates each phase."
      }
    ]
  },
  {
    name: "RandLE-Ring",
    topology: "ring",
    complexity: "O(n) deterministic rounds; expected O(n log n) messages.",
    description: "Each node chooses a random rank; tokens carry (rank, ID) and move clockwise only when lexicographically smaller than the receiver's pair.",
    title: "RandLE-Ring (Randomized Ring Leader Election)",
    summary: "Nodes pick random real ranks in [0, 1). Lexicographical comparison breaks ties, achieving expected O(n log n) message complexity even on worst-case ID placements.",
    steps: [
      {
        step_number: 1,
        title: "Rank Assignment",
        tag: "INIT",
        content: "Each node v draws uniform rank r_v in [0, 1) and sends RANK_TOKEN (r_v, ID_v) clockwise."
      },
      {
        step_number: 2,
        title: "Lexicographical Forwarding",
        tag: "FILTER",
        content: "Forward token if (rank, ID) < (local_rank, local_id). Discard otherwise."
      }
    ]
  },
  {
    name: "SimpleLE-CN",
    topology: "complete",
    complexity: "1 round; Θ(n²) messages.",
    description: "Each node sends its ID to every other node; the minimum-ID node elects itself.",
    title: "SimpleLE-CN (All-to-All Complete Network Election)",
    summary: "Single-round all-to-all broadcast across the clique. Every node collects n-1 IDs; node with minimal ID elects itself.",
    steps: [
      {
        step_number: 1,
        title: "All-to-All Broadcast (Round 0)",
        tag: "BROADCAST",
        content: "Every node broadcasts its ID to all n-1 neighbors in the complete graph."
      },
      {
        step_number: 2,
        title: "Minimum Selection (Round 1)",
        tag: "DECIDE",
        content: "Each node inspects all n-1 received IDs. Node with min(IDs) becomes leader."
      }
    ]
  },
  {
    name: "RandLE-CN",
    topology: "complete",
    complexity: "O(1) rounds w.h.p.; O(√n log^(3/2)n) messages w.h.p.",
    description: "Candidates are sampled with probability 2 log(n)/n. Each candidate selects about 2√(n log n) referees with replacement; referees notify the highest-ranked candidate they hear from.",
    title: "RandLE-CN (Sub-quadratic Complete Network Election)",
    summary: "Uses birthday-paradox referee sampling. Candidates poll random referees; referees vote for the best candidate.",
    steps: [
      {
        step_number: 1,
        title: "Candidate Sampling & Referee Selection",
        tag: "SAMPLE",
        content: "Nodes elect themselves candidates with probability 2 log(n)/n. Candidates select k = 2√(n log n) random referees."
      },
      {
        step_number: 2,
        title: "Referee Voting",
        tag: "VOTE",
        content: "Referees send confirmation to the best candidate they heard from."
      }
    ]
  },
  {
    name: "BasicLE-Gen",
    topology: "general",
    complexity: "O(D) rounds; O(D|E|) worst-case messages.",
    description: "Each node propagates its smallest known ID to all neighbors whenever its local minimum improves. Stops after the known graph diameter D.",
    title: "BasicLE-Gen (Diameter Flooding on General Graphs)",
    summary: "Nodes maintain their smallest observed ID and flood improvements to all neighbors. Stops after diameter D rounds.",
    steps: [
      {
        step_number: 1,
        title: "Local Flood",
        tag: "FLOOD",
        content: "Each node sends its minimum known ID to all incident edges."
      },
      {
        step_number: 2,
        title: "Diameter Bound Stop",
        tag: "HALT",
        content: "After D rounds, the minimum ID has traversed the entire network radius and is known to all nodes."
      }
    ]
  },
  {
    name: "RandLE-Gen",
    topology: "general",
    complexity: "O(D) deterministic rounds; expected O(|E| min{log n, D}) messages.",
    description: "Same update protocol as BasicLE-Gen, but each node starts with an independent random rank rather than its ID.",
    title: "RandLE-Gen (Randomized Flooding on General Graphs)",
    summary: "Random rank assignment reduces average updates per edge to O(min{log n, D}), avoiding worst-case cascades.",
    steps: [
      {
        step_number: 1,
        title: "Rank Initialization",
        tag: "INIT",
        content: "Nodes pick random real ranks and flood them across neighbors."
      }
    ]
  }
];
