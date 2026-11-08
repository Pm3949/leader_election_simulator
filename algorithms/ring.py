import math, random

class BasicRing:
    name="BasicLE-Ring"; topology="ring"; complexity="O(n) rounds; O(n²) worst-case messages."
    description="IDs circulate clockwise; a node forwards only a smaller ID. A token returning to its origin elects that node."
    def initialize(self,s,seed):
        self.ids=s.ids; self.n=len(self.ids); self.done=False
        for v in self.ids: s.send(v,(v+1)%self.n,"ID_TOKEN",token=self.ids[v],origin=v)
    def step(self,s):
        for v,node in s.nodes.items():
            inbox,node.inbox=node.inbox,[]
            for src,kind,p in inbox:
                if kind!="ID_TOKEN": continue
                if p['origin']==v:
                    node.status='elected'; self.leader=v; self.done=True
                elif p['token']<self.ids[v]:
                    node.status='non-elected'; s.send(v,(v+1)%self.n,kind,**p)
                else: s.log('TOKEN DISCARDED',v,src,f"{p['token']} is not smaller than {self.ids[v]}",'drop')
        if self.done:
            for v,node in s.nodes.items():
                if v!=self.leader: node.status='non-elected'
    def finished(self,s): return self.done
    def result(self,s): return {'leaders':[self.leader],'rounds':s.round,'messages':s.message_count}

class RandomRing(BasicRing):
    name="RandLE-Ring"; complexity="O(n) deterministic rounds; expected O(n log n) messages."
    description="Each node chooses a random rank; tokens carry (rank, ID) and move clockwise only when lexicographically smaller than the receiver's pair."
    def initialize(self,s,seed):
        self.ids=s.ids; self.n=len(self.ids); self.done=False; rng=random.Random(seed)
        self.keys={v:(rng.random(),self.ids[v]) for v in self.ids}
        for v in self.ids: s.send(v,(v+1)%self.n,'RANK_TOKEN',key=self.keys[v],origin=v)
    def step(self,s):
        for v,node in s.nodes.items():
            inbox,node.inbox=node.inbox,[]
            for src,kind,p in inbox:
                if kind!='RANK_TOKEN': continue
                if p['origin']==v:
                    self.leader=v; self.done=True; node.status='elected'
                elif p['key']<self.keys[v]:
                    node.status='non-elected'; s.send(v,(v+1)%self.n,kind,**p)
                else: s.log('TOKEN DISCARDED',v,src,f"{p['key']} >= {self.keys[v]}",'drop')
        if self.done:
            for v,node in s.nodes.items():
                if v!=self.leader: node.status='non-elected'

class ImprovedRing:
    name = "ImprovedLE-Ring"
    topology = "ring"
    complexity = "O(n) rounds; O(n log n) messages."
    description = "Bidirectional phased elimination (Hirschberg-Sinclair). In phase k, candidates probe 2^k hops in both directions and survive only if both probes return."

    def initialize(self, s, seed):
        self.ids = s.ids
        self.n = len(self.ids)
        self.active = set(self.ids.keys())
        self.phase = 0
        self.leader = None
        self.done = False
        self.begin_phase(s)

    def begin_phase(self, s):
        self.phase_start = s.round
        self.dist = min(2**self.phase, self.n)
        self.replies = {v: set() for v in self.active}
        for v in self.active:
            for d in (-1, 1):
                s.send(v, (v + d) % self.n, 'PROBE', origin=v, token=self.ids[v], direction=d, remaining=self.dist)

    def step(self, s):
        if self.done:
            return

        for v, node in s.nodes.items():
            inbox, node.inbox = node.inbox, []
            for src, kind, p in inbox:
                if kind == 'PROBE':
                    origin = p['origin']
                    token = p['token']
                    d = p['direction']
                    rem = p['remaining']

                    if origin == v:
                        # Full circle traversed! Elect leader immediately!
                        self.leader = v
                        self.done = True
                        node.status = 'elected'
                        s.log('ELECTED', v, None, f'Probe circled the entire ring back to Node {v}', 'success')
                        continue

                    if self.ids[v] < token:
                        s.log('PROBE BLOCKED', v, src, f"Node {v} (ID {self.ids[v]}) blocks token {token}", 'drop')
                    else:
                        # token < ids[v]: node v yields
                        if v in self.active:
                            node.status = 'non-elected'
                        
                        if rem > 1:
                            s.send(v, (v + d) % self.n, 'PROBE', origin=origin, token=token, direction=d, remaining=rem - 1)
                        else:
                            # Reached boundary of phase k: turn around and send RETURN in opposite direction
                            ret_dir = -d
                            s.send(v, (v + ret_dir) % self.n, 'RETURN', origin=origin, token=token, direction=d)

                elif kind == 'RETURN':
                    origin = p['origin']
                    d = p['direction']  # Outward direction being confirmed

                    if origin == v:
                        if v in self.replies:
                            self.replies[v].add(d)
                    else:
                        # Forward RETURN along opposite direction towards origin
                        ret_dir = -d
                        s.send(v, (v + ret_dir) % self.n, 'RETURN', origin=origin, token=p['token'], direction=d)

        if self.done:
            for v, node in s.nodes.items():
                if v != self.leader:
                    node.status = 'non-elected'
            return

        # Check phase completion: outbound took dist rounds, return took dist rounds -> 2*dist rounds
        if s.round - self.phase_start >= 2 * self.dist:
            survivors = {v for v, r in self.replies.items() if r == {-1, 1}}
            eliminated = self.active - survivors
            for v in eliminated:
                s.nodes[v].status = 'non-elected'
                s.log('NODE ELIMINATED', details=f"Node {v} (ID {self.ids[v]}) eliminated in phase {self.phase}")

            self.active = survivors
            # No global shortcut: the winner only learns it won when its probe
            # (dist == n) travels the whole ring and returns to it (origin == v).
            self.phase += 1
            self.begin_phase(s)

    def finished(self, s):
        return self.done

    def result(self, s):
        return {'leaders': [self.leader], 'rounds': s.round, 'messages': s.message_count, 'phases': self.phase + 1}