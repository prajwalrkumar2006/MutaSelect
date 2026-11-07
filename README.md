# MutaSelect AI

**Production-Quality RTL Mutation Testing & ML-Assisted Regression Suite Optimizer**

MutaSelect AI uses syntax-aware hardware mutation testing and Machine Learning to select the smallest effective RTL regression test suite for **any user-supplied Verilog or SystemVerilog design and testbench**, backed by a deterministic safety fallback layer.

---

## 🔌 Local Windows EDA Agent (ModelSim & Vivado)

To execute simulations using your actual Windows EDA tools (**Mentor Graphics / Siemens ModelSim** or **Xilinx Vivado Simulator**):

1. **Launch the Local Agent**:
   - Double-click `start_agent.bat` in the repository root, OR
   - Run in PowerShell / CMD:
     ```bash
     python local_eda_agent.py --port 8000
     ```
2. **Auto-Detection**:
   - The agent automatically searches `C:\intelFPGA\...\win32aloem`, `C:\modeltech64_*\win64`, and `C:\Xilinx\Vivado\*\bin`.
   - In the web dashboard, open **Settings** -> **EDA Toolchain & Local Windows Agent Settings**.
   - Click **"Test Connection"** on ModelSim or Vivado to view your live version banner and license check.
3. **Simulate the JK Flip-Flop Deliverable**:
   - Go to **Projects**, select **JK Flip-Flop (ModelSim & Vivado Benchmark)**.
   - In **Configuration Gate**, choose **ModelSim** or **Vivado** and click **Confirm & Freeze Configuration Snapshot**.
   - In **Baseline Gate**, click **Execute Baseline Check** to run real batch simulation (`vlib work -> vlog -sv -> vsim -c -do "run -all; quit -f"`).

---

## 🏛 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    React + Vite Frontend                     │
│        (Dark Navy/Cyan EDA Dashboard, Tailwind, Recharts)     │
│             Hosted on Firebase Hosting / Cloud Run           │
└───────────────┬───────────────────────────────┬──────────────┘
                │ Realtime Listeners & Auth     │ HTTP / WebSocket REST
                ▼                               ▼
┌───────────────────────────────┐  ┌──────────────────────────────┐
│       Google Firebase         │  │    Cloud Run Compute Worker  │
│  - Firebase Auth (Google)     │  │  (Ubuntu + Verilator +       │
│  - Firestore (State & Models) │  │   Icarus + cocotb + sklearn) │
│  - Cloud Storage (RTL & Logs) │  │  FastAPI Isolated Sandboxes  │
└───────────────────────────────┘  └──────────────────────────────┘
```

---

## 🚀 Deployment Instructions

### 1. Deploy the Compute Worker to Google Cloud Run

The simulation engine runs in an isolated, sandboxed Docker container on Google Cloud Run with Verilator, Icarus Verilog, cocotb, and Scikit-Learn.

```bash
# Set your Google Cloud Project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy the Docker container to Cloud Run
gcloud run deploy mutaselect-worker \
    --source . \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --cpu 2 \
    --memory 2Gi \
    --timeout 300 \
    --concurrency 10
```

Once deployed, copy the generated Service URL (e.g. `https://mutaselect-worker-xyz-uc.a.run.app`).

### 2. Configure Frontend Environment

In your production environment or `.env`, set:
```bash
VITE_BACKEND_URL="https://mutaselect-worker-xyz-uc.a.run.app"
```

### 3. Deploy Frontend & Security Rules to Firebase

```bash
# 1. Install dependencies and build web app
npm install
npm run build

# 2. Deploy Firestore Rules, Storage Rules, and Web Hosting
firebase deploy --only firestore:rules,storage,hosting
```

---

## 🔌 How to Add an Operator Plugin

Mutation operators are strictly decoupled plugins. To add a new operator:

1. Create a class inheriting from `MutationOperatorPlugin` in `worker/mutation_engine.py`:
```python
class MyCustomOperator(MutationOperatorPlugin):
    category = "fsm_state_corrupt"
    description = "Corrupt FSM next-state assign to IDLE"

    def applies_to(self, line: str, context: dict) -> bool:
        return "next_state <=" in line

    def mutate(self, line: str, context: dict) -> list[str]:
        return [line.replace("next_state <=", "next_state <= S_IDLE // mutated")]
```
2. Register the instance in `DEFAULT_OPERATORS`. No changes to the core verification or selection engines are required!

---

## 🧪 Running Worker Engine Tests

The worker includes unit tests across 3 structurally distinct hardware designs (ALU, FSM Controller, Parameterized Counter/Shift Register), plus tests for broken syntax gates, failing testbenches, and unsupported constructs:

```bash
cd worker
pytest -v tests/test_engine.py
```
