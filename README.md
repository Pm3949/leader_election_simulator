# Distributed Leader Election Simulator

Streamlit simulator for Chapter 5 of Gopal Pandurangan's *Distributed Network Algorithms*.

## Run
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

The engine uses a central synchronous-round scheduler. Every node has local state and an inbox; messages sent in round r are delivered at the beginning of round r+1. This avoids OS-thread scheduling races while modeling lock-step distributed rounds.

Included algorithms: BasicLE-Ring, ImprovedLE-Ring, RandLE-Ring, SimpleLE-CN, RandLE-CN, BasicLE-Gen, RandLE-Gen. Ring algorithms require a ring, complete-network algorithms require a clique, and general-network algorithms accept connected graphs.

Educational implementation. In particular, BasicLE-Gen uses the known-diameter stopping rule; the book's BFS-tree accept/reject/echo termination-detection extension is a planned enhancement. RandLE-CN exposes a fallback warning for finite small trials where the high-probability unique-winner event does not occur.
# leader_election_simulator
