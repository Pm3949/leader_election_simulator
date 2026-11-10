# Distributed Leader Election Simulator

Interactive distributed systems visualizer and simulator for Chapter 5 of Gopal Pandurangan's *Distributed Network Algorithms*.

---

## Architecture Overview (Unified Single-Service)

This repository includes a **FastAPI + React** interactive simulator (with 60 FPS animated message packets and timeline scrubber) alongside the original Streamlit dashboard.

- **Backend:** Python + NetworkX + FastAPI (`server.py`) wrapping `core/engine.py` and `algorithms/`.
- **Frontend:** Modern React + Tailwind CSS + Lucide Icons + SVG Network Canvas (`frontend/`).
- **Deployment:** Deploys as a **single web service on Render** (FastAPI serves both the API endpoints and the compiled React frontend from `frontend/dist`).

---

## Algorithms Included

- **Ring Networks:**
  - `BasicLE-Ring` (LCR Algorithm — LeLann, Chang & Roberts): $O(n)$ rounds, $O(n^2)$ worst-case messages.
  - `ImprovedLE-Ring` (Hirschberg-Sinclair / HS Algorithm): $O(n)$ rounds, $O(n \log n)$ messages via phase doubling.
  - `RandLE-Ring`: $O(n)$ rounds, expected $O(n \log n)$ messages with random ranks.
- **Complete Networks:**
  - `SimpleLE-CN`: 1 round, $\Theta(n^2)$ messages via all-to-all broadcast.
  - `RandLE-CN`: $O(1)$ rounds, $O(\sqrt{n} \log^{3/2} n)$ messages w.h.p. via referee sampling.
- **General Connected Networks:**
  - `BasicLE-Gen`: $O(D)$ rounds, $O(D|E|)$ messages via local minimum flooding.
  - `RandLE-Gen`: $O(D)$ rounds, expected $O(|E| \min\{\log n, D\})$ messages with random ranks.

---

## Local Development

### 1. Run the Modern React + FastAPI App (Recommended)

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Build the frontend (one time or whenever editing frontend code)
cd frontend
npm install
npm run build
cd ..

# 3. Start the unified server
python server.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

> For live React hot-reloading during frontend development:
> ```bash
> cd frontend
> npm run dev
> ```
> Frontend runs at `http://localhost:5173` and proxies API requests to `http://localhost:8000`.

### 2. Run the Streamlit Dashboard (Alternative)

```bash
streamlit run app.py
```

---

## Deploy to Render (All-in-One Service)

You can deploy this as a single web service on Render's free tier:

### Option 1: Via Render Blueprint (`render.yaml`)
1. Push this repository to GitHub.
2. In Render, navigate to **Blueprints** &rarr; **New Blueprint Instance**.
3. Connect your repository. Render automatically reads `render.yaml` and deploys.

### Option 2: Manual Web Service Setup
1. In Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name:** `leader-election-simulator`
   - **Environment:** `Python 3`
   - **Build Command:**
     ```bash
     cd frontend && npm install && npm run build && cd .. && pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn server:app --host 0.0.0.0 --port $PORT
     ```
4. Click **Deploy Web Service**.

---

## Deploy Decoupled (Frontend on Vercel + Backend on Render)

If deploying the frontend on **Vercel** and the backend on **Render**:

1. **Deploy Backend on Render:**
   - Deploy as a Python Web Service with Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`.
   - Copy your Render URL: `https://<your-service>.onrender.com`.

2. **Deploy Frontend on Vercel:**
   - In Vercel, import your GitHub repository.
   - Set **Root Directory** to `frontend`.
   - In **Environment Variables**, add:
     - `VITE_API_URL` = `https://<your-service>.onrender.com` (without trailing slash).
   - Click **Deploy**. Vercel will automatically run `npm run build` and connect directly to your Render backend.
