from algorithms.ring import BasicRing, ImprovedRing, RandomRing
from algorithms.complete import SimpleComplete, RandomComplete
from algorithms.general import BasicGeneral, RandomGeneral
ALGORITHMS = {a.name: a for a in [BasicRing(), ImprovedRing(), RandomRing(), SimpleComplete(), RandomComplete(), BasicGeneral(), RandomGeneral()]}
