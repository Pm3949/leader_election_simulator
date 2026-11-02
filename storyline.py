"""
Generates structured narrative explanations of simulation rounds
for distributed leader election algorithms.
"""

def generate_round_storyline(sim, ids):
    """
    Analyzes sim.events and current round state to produce a list of
    clear, structured narrative steps explaining why decisions were made.
    """
    current_round = sim.round
    storyline = []

    # 1. Round 0 / Initialization Storyline
    if current_round == 0:
        storyline.append({
            'badge': 'INITIALIZED',
            'badge_color': '#3b82f6',
            'title': f'{sim.algorithm.name} Initialized',
            'detail': f'Network topology initialized with {len(sim.nodes)} nodes. Initial tokens are queued for delivery in Round 1.',
            'nodes': list(sim.nodes.keys())
        })
        for v, node in sim.nodes.items():
            out_msgs = [m for m in sim.pending.get(1, []) if m[0] == v]
            if out_msgs:
                targets = [str(m[1]) for m in out_msgs]
                storyline.append({
                    'badge': 'OUTBOX',
                    'badge_color': '#6366f1',
                    'title': f'Node {v} (ID: {ids[v]})',
                    'detail': f'Dispatched initial message(s) to Node(s) {", ".join(targets)}.',
                    'nodes': [v] + [m[1] for m in out_msgs]
                })
        return storyline

    # 2. Extract events from current round
    round_events = [e for e in sim.events if e.round == current_round]

    # Check for election finish
    if sim.finished:
        leader_ids = sim.result_data.get('leaders', [])
        storyline.append({
            'badge': 'ELECTED',
            'badge_color': '#10b981',
            'title': f'Leader Elected: Node {leader_ids}',
            'detail': f'The election algorithm reached termination. Node {leader_ids} has been declared leader in {sim.round} rounds with {sim.message_count} total messages transmitted.',
            'nodes': leader_ids
        })

    # Group receive and discard/forward events
    discards = [e for e in round_events if e.event in ('TOKEN DISCARDED', 'PROBE BLOCKED')]
    for d in discards:
        v = d.src
        sender = d.dst
        reason = d.details
        storyline.append({
            'badge': 'DISCARDED',
            'badge_color': '#ef4444',
            'title': f'Node {v} Dropped Message from Node {sender}',
            'detail': f'Node {v} (ID: {ids.get(v, v)}) dropped token: {reason}. Candidate eliminated from this path.',
            'nodes': [v, sender] if sender is not None else [v]
        })

    # Eliminated events
    eliminated = [e for e in round_events if e.event == 'NODE ELIMINATED']
    for el in eliminated:
        storyline.append({
            'badge': 'ELIMINATED',
            'badge_color': '#94a3b8',
            'title': 'Candidate Eliminated',
            'detail': f'{el.details}. Transitions to non-candidate / forwarder.',
            'nodes': []
        })

    # Forwarding / Send events in this round
    sends = [e for e in round_events if e.event == 'SEND']
    for s in sends:
        src = s.src
        dst = s.dst
        det = s.details
        storyline.append({
            'badge': 'FORWARDED',
            'badge_color': '#10b981',
            'title': f'Node {src} Forwarded to Node {dst}',
            'detail': f'Node {src} (ID: {ids.get(src, src)}) forwarded packet: {det}',
            'nodes': [src, dst]
        })

    # Fallback or warning
    warnings = [e for e in round_events if e.kind == 'warning']
    for w in warnings:
        storyline.append({
            'badge': 'NOTICE',
            'badge_color': '#f59e0b',
            'title': w.event,
            'detail': w.details,
            'nodes': []
        })

    # In-flight messages for upcoming round
    target_round = current_round + 1
    next_in_flight = sim.pending.get(target_round, [])
    if next_in_flight and not sim.finished:
        storyline.append({
            'badge': 'IN TRANSIT',
            'badge_color': '#0ea5e9',
            'title': f'{len(next_in_flight)} Message(s) Queued for Round {target_round}',
            'detail': f'Packets are in transmission and scheduled for delivery at the start of round {target_round}.',
            'nodes': list(set([m[0] for m in next_in_flight] + [m[1] for m in next_in_flight]))
        })

    if not storyline:
        storyline.append({
            'badge': 'IDLE',
            'badge_color': '#64748b',
            'title': 'No state changes this round',
            'detail': 'Waiting for scheduled messages or rounds to complete.',
            'nodes': []
        })

    return storyline
