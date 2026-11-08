import math, random


class SimpleComplete:
    name = 'SimpleLE-CN'; topology = 'complete'; complexity = '1 round; Θ(n²) messages.'
    description = 'Each node sends its ID to every other node; the minimum-ID node elects itself.'

    def initialize(self, s, seed):
        self.ids = s.ids; self.done = False
        for v in self.ids:
            for u in self.ids:
                if u != v:
                    s.send(v, u, 'ID_BROADCAST', node_id=self.ids[v])

    def step(self, s):
        for v, node in s.nodes.items():
            got = [p['node_id'] for _, k, p in node.inbox if k == 'ID_BROADCAST']
            node.inbox = []
            if len(got) == len(self.ids) - 1:
                node.status = 'elected' if self.ids[v] < min(got, default=float('inf')) else 'non-elected'
        self.done = all(n.status != 'active' for n in s.nodes.values())

    def finished(self, s): return self.done

    def result(self, s):
        return {'leaders': [v for v, n in s.nodes.items() if n.status == 'elected'],
                'rounds': s.round, 'messages': s.message_count}


class RandomComplete:
    name = 'RandLE-CN'; topology = 'complete'
    complexity = 'O(1) rounds w.h.p.; O(√n log^(3/2)n) messages w.h.p.'
    description = ('Candidates are sampled with probability 2 log(n)/n. Each candidate selects about '
                   '2√(n log n) referees with replacement; referees notify the highest-ranked candidate '
                   'they hear from. A candidate elects itself only if it wins every referee contest.')

    def initialize(self, s, seed):
        self.ids = s.ids; self.rng = random.Random(seed); n = len(self.ids)
        p = min(1, 2 * math.log(max(n, 2)) / n)
        self.candidates = [v for v in self.ids if self.rng.random() < p]   # may be empty (rare failure)
        self.ranks = {v: self.rng.randrange(1, max(2, n ** 4) + 1) for v in self.candidates}
        self.k = max(1, math.ceil(2 * math.sqrt(n * math.log(max(n, 2)))))
        self.expected = {v: 0 for v in self.candidates}
        self.wins = {v: 0 for v in self.candidates}
        self.done = False
        for v, node in s.nodes.items():
            node.status = 'candidate' if v in self.candidates else 'non-elected'
        for c in self.candidates:
            refs = [self.rng.choice(list(self.ids)) for _ in range(self.k)]
            self.expected[c] = len(set(refs))
            for r in set(refs):                       # one message per distinct referee
                s.send(c, r, 'CANDIDATE_RANK', candidate=c, rank=self.ranks[c])
        if not self.candidates:
            s.log('NO CANDIDATES', details='No node was sampled; protocol fails this run (low probability).', kind='warning')

    def step(self, s):
        for r, node in s.nodes.items():
            msgs = [m for m in node.inbox if m[1] == 'CANDIDATE_RANK']
            node.inbox = [m for m in node.inbox if m[1] != 'CANDIDATE_RANK']
            if msgs:
                winner = max(msgs, key=lambda m: (m[2]['rank'], -m[2]['candidate']))[2]['candidate']
                s.send(r, winner, 'REFEREE_WIN', referee=r)
        for c, node in s.nodes.items():
            msgs = [m for m in node.inbox if m[1] == 'REFEREE_WIN']
            node.inbox = [m for m in node.inbox if m[1] != 'REFEREE_WIN']
            if c in self.wins:
                self.wins[c] += len(msgs)
        if s.round >= 2 and not self.done:
            # Each candidate decides LOCALLY; no global fallback.
            for c in self.candidates:
                s.nodes[c].status = 'elected' if self.wins[c] >= self.expected[c] else 'non-elected'
            self.leaders = [c for c in self.candidates if s.nodes[c].status == 'elected']
            if len(self.leaders) != 1:
                s.log('ELECTION FAILED', details=f'{len(self.leaders)} leaders elected (expected 1). '
                      'This is the real w.h.p. failure case; re-run with another seed.', kind='warning')
            self.done = True

    def finished(self, s): return self.done

    def result(self, s):
        return {'leaders': self.leaders, 'rounds': s.round, 'messages': s.message_count,
                'candidates': len(self.candidates), 'referees_per_candidate': self.k,
                'unique_leader': len(self.leaders) == 1}