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
    name="ImprovedLE-Ring"; topology="ring"; complexity="O(n) rounds; O(n log n) messages."
    description="Bidirectional phased elimination. In phase i, active nodes probe up to 2^i hops in both directions and survive only if both probes return."
    def initialize(self,s,seed):
        self.ids=s.ids; self.n=len(self.ids); self.active=set(self.ids); self.phase=0; self.phase_start=s.round; self.wait={}; self.leader=None
        self.begin(s)
    def begin(self,s):
        self.phase_start=s.round; self.dist=min(2**self.phase,self.n); self.wait={v:set() for v in self.active}
        for v in self.active:
            for d in (-1,1): s.send(v,(v+d)%self.n,'PROBE',origin=v,token=self.ids[v],direction=d,remaining=self.dist-1)
    def step(self,s):
        for v,node in s.nodes.items():
            inbox,node.inbox=node.inbox,[]
            for src,kind,p in inbox:
                if kind=='PROBE':
                    if self.ids[v]<p['token']: s.log('PROBE BLOCKED',v,src,f"ID {self.ids[v]} blocks {p['token']}",'drop')
                    elif p['remaining']==0: s.send(v,p['origin'],'RETURN',origin=p['origin'],direction=p['direction'])
                    else: s.send(v,(v+p['direction'])%self.n,'PROBE',**{**p,'remaining':p['remaining']-1})
                elif kind=='RETURN' and p['origin'] in self.wait: self.wait[p['origin']].add(p['direction'])
        if s.round-self.phase_start>=2*self.dist:
            survivors={v for v,dirs in self.wait.items() if dirs=={-1,1}}
            for v in self.active-survivors: s.nodes[v].status='non-elected'; s.log('NODE ELIMINATED',details=f'Node {v}, phase {self.phase}')
            self.active=survivors
            if self.dist>=self.n or self.phase>=math.ceil(math.log2(self.n))+1:
                self.leader=min(self.active,key=lambda v:self.ids[v]) if self.active else min(self.ids,key=self.ids.get)
                for v,node in s.nodes.items(): node.status='elected' if v==self.leader else 'non-elected'
            else: self.phase+=1; self.begin(s)
    def finished(self,s): return self.leader is not None
    def result(self,s): return {'leaders':[self.leader],'rounds':s.round,'messages':s.message_count,'phases':self.phase+1}
