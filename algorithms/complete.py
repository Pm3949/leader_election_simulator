import math, random
class SimpleComplete:
    name='SimpleLE-CN'; topology='complete'; complexity='1 round; Θ(n²) messages.'
    description='Each node sends its ID to every other node; the minimum-ID node elects itself.'
    def initialize(self,s,seed):
        self.ids=s.ids; self.done=False
        for v in self.ids:
            for u in self.ids:
                if u!=v: s.send(v,u,'ID_BROADCAST',node_id=self.ids[v])
    def step(self,s):
        for v,node in s.nodes.items():
            got=[p['node_id'] for _,k,p in node.inbox if k=='ID_BROADCAST']; node.inbox=[]
            if len(got)==len(self.ids)-1: node.status='elected' if self.ids[v]==min(self.ids.values()) else 'non-elected'
        self.done=all(n.status!='active' for n in s.nodes.values())
    def finished(self,s): return self.done
    def result(self,s): return {'leaders':[v for v,n in s.nodes.items() if n.status=='elected'],'rounds':s.round,'messages':s.message_count}

class RandomComplete:
    name='RandLE-CN'; topology='complete'; complexity='O(1) rounds w.h.p.; O(√n log^(3/2)n) messages w.h.p.'
    description='Candidates are sampled with probability 2 log(n)/n. Each candidate selects about 2√(n log n) referees with replacement; referees notify the highest-ranked candidate they hear from.'
    def initialize(self,s,seed):
        self.ids=s.ids; self.rng=random.Random(seed); n=len(self.ids); p=min(1,2*math.log(max(n,2))/n)
        self.candidates=[v for v in self.ids if self.rng.random()<p] or [min(self.ids,key=self.ids.get)]
        self.ranks={v:self.rng.randrange(1,max(2,n**4)+1) for v in self.candidates}; self.k=max(1,math.ceil(2*math.sqrt(n*math.log(max(n,2)))))
        self.expected={v:0 for v in self.candidates}; self.wins={v:0 for v in self.candidates}; self.done=False
        for v,node in s.nodes.items(): node.status='candidate' if v in self.candidates else 'non-elected'
        for c in self.candidates:
            refs=[self.rng.choice(list(self.ids)) for _ in range(self.k)]; self.expected[c]=len(set(refs))
            for r in refs: s.send(c,r,'CANDIDATE_RANK',candidate=c,rank=self.ranks[c])
    def step(self,s):
        for r,node in s.nodes.items():
            msgs=[m for m in node.inbox if m[1]=='CANDIDATE_RANK']; node.inbox=[m for m in node.inbox if m[1]!='CANDIDATE_RANK']
            if msgs:
                winner=max(msgs,key=lambda m:(m[2]['rank'],-m[2]['candidate']))[2]['candidate']; s.send(r,winner,'REFEREE_WIN',referee=r)
        for c,node in s.nodes.items():
            msgs=[m for m in node.inbox if m[1]=='REFEREE_WIN']; node.inbox=[m for m in node.inbox if m[1]!='REFEREE_WIN']
            if c in self.wins: self.wins[c]+=len(msgs)
        if s.round>=2 and not self.done:
            wins=[c for c in self.candidates if self.wins[c]>=self.expected[c]]
            self.leader=wins[0] if len(wins)==1 else max(self.candidates,key=lambda c:(self.wins[c],self.ranks[c]))
            self.fallback=len(wins)!=1
            for v,node in s.nodes.items(): node.status='elected' if v==self.leader else 'non-elected'
            if self.fallback: s.log('FALLBACK USED',details='No unique candidate won all referee competitions in this finite trial; fallback is a simulator safeguard, not part of the book protocol.',kind='warning')
            self.done=True
    def finished(self,s): return self.done
    def result(self,s): return {'leaders':[self.leader],'rounds':s.round,'messages':s.message_count,'candidates':len(self.candidates),'referees_per_candidate':self.k,'fallback_used':self.fallback}
