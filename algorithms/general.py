import random, networkx as nx
class BasicGeneral:
    name='BasicLE-Gen'; topology='general'; complexity='O(D) rounds; O(D|E|) worst-case messages.'
    description='Each node propagates its smallest known ID to all neighbors whenever its local minimum improves. Stops after the known graph diameter D.'
    message_kind='MIN_UPDATE'
    def initialize(self,s,seed):
        self.ids=s.ids; self.D=nx.diameter(s.graph); self.done=False
        self.values={v:self.ids[v] for v in self.ids}
        for v in self.ids:
            for u in s.graph.neighbors(v): s.send(v,u,self.message_kind,value=self.values[v])
    def step(self,s):
        for v,node in s.nodes.items():
            inbox,node.inbox=node.inbox,[]; best=self.values[v]
            for _,kind,p in inbox:
                if kind==self.message_kind: best=min(best,p['value'])
            if best<self.values[v]:
                self.values[v]=best
                for u in s.graph.neighbors(v): s.send(v,u,self.message_kind,value=best)
        if s.round>=self.D:
            self.leader=min(self.ids,key=self.ids.get)
            for v,node in s.nodes.items(): node.status='elected' if v==self.leader else 'non-elected'
            self.done=True
    def finished(self,s): return self.done
    def step(self,s):
        for v,node in s.nodes.items():
            inbox,node.inbox=node.inbox,[]; best=self.values[v]
            for _,kind,p in inbox:
                if kind==self.message_kind: best=min(best,p['value'])
            if best<self.values[v]:
                self.values[v]=best
                for u in s.graph.neighbors(v): s.send(v,u,self.message_kind,value=best)
        if s.round>=self.D:
            self.leader=min(self.values,key=self.values.get)
            for v,node in s.nodes.items(): node.status='elected' if v==self.leader else 'non-elected'
            self.done=True
    def result(self,s): return {'leaders':[self.leader],'rounds':s.round,'messages':s.message_count,'diameter':self.D}
class RandomGeneral(BasicGeneral):
    name='RandLE-Gen'; complexity='O(D) deterministic rounds; expected O(|E| min{log n, D}) messages.'
    description='Same update protocol as BasicLE-Gen, but each node starts with an independent random rank rather than its ID.'
    message_kind='RANK_UPDATE'
    def initialize(self,s,seed):
        self.ids=s.ids; self.D=nx.diameter(s.graph); self.done=False; rng=random.Random(seed)
        self.values={v:rng.random() for v in self.ids}
        for v in self.ids:
            for u in s.graph.neighbors(v): s.send(v,u,self.message_kind,value=self.values[v])
    def step(self,s):
        for v,node in s.nodes.items():
            inbox,node.inbox=node.inbox,[]; best=self.values[v]
            for _,kind,p in inbox:
                if kind==self.message_kind: best=min(best,p['value'])
            if best<self.values[v]:
                self.values[v]=best
                for u in s.graph.neighbors(v): s.send(v,u,self.message_kind,value=best)
        if s.round>=self.D:
            self.leader=min(self.values,key=self.values.get)
            for v,node in s.nodes.items(): node.status='elected' if v==self.leader else 'non-elected'
            self.done=True
    def result(self,s): return {'leaders':[self.leader],'rounds':s.round,'messages':s.message_count,'diameter':self.D}
