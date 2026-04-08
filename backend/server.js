import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import http from 'http';
import process from 'process';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const WS_PORT = 8080;

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Setup HTTP Server & WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ port: WS_PORT });

// Mock Data Definitions for Telemetry
const processes = [
  'automotive-assembly', 'food-beverage', 'pharma-batch', 'material-handling',
  'cnc-machine', 'robotic-cell', 'injection-molding', 'quality-vision',
  'hvac', 'energy-mgmt', 'mining-conveyor', 'crushing-grinding',
  'mine-hoisting', 'mine-ventilation', 'dewatering', 'wellhead',
  'drilling-rig', 'gas-oil-sep', 'crude-distillation', 'fcc-blending'
];

// Uncertainty Estimator Core
class UncertaintyEstimator {
  constructor() {
    this.kappaMap = {
      'automotive-assembly': 0.30, 'food-beverage': 0.25, 'pharma-batch': 0.20, 'material-handling': 0.35,
      'cnc-machine': 0.25, 'robotic-cell': 0.30, 'injection-molding': 0.28, 'quality-vision': 0.15,
      'hvac': 0.18, 'energy-mgmt': 0.22, 'mining-conveyor': 0.45, 'crushing-grinding': 0.50,
      'mine-hoisting': 0.60, 'mine-ventilation': 0.35, 'dewatering': 0.60, 'wellhead': 0.40,
      'drilling-rig': 0.65, 'gas-oil-sep': 0.38, 'crude-distillation': 0.55, 'fcc-blending': 0.42
    };
  }

  getProcessKappa(processType) {
    return this.kappaMap[processType] ?? 0.35;
  }

  calculateDynamicEnvelope(observedVelocity, baseCovariance = 0.1, kappa = 0.35, currentTtc) {
    const sigmaPos = baseCovariance + kappa * Math.abs(observedVelocity);

    const riskFlags = [];
    if (currentTtc < 2.0) riskFlags.push('TTC_CRITICAL');
    if (sigmaPos > 1.5) riskFlags.push('HIGH_UNCERTAINTY');

    return {
      sigmaPos,
      ttcSeconds: currentTtc,
      velocityMagnitude: observedVelocity,
      riskFlags,
      safetyEnvelopeExpanded: sigmaPos > baseCovariance * 1.5
    };
  }
}

const estimator = new UncertaintyEstimator();

// WebSocket Broadcaster
wss.on('connection', (ws) => {
  console.log('Client connected to telemetry stream');
  
  const interval = setInterval(() => {
    // Generate mock high-frequency telemetry for all processes
    const telemetryData = {};
    processes.forEach(pid => {
      const k = estimator.getProcessKappa(pid);
      const vel = parseFloat((Math.random() * 4).toFixed(2));
      const ttc = parseFloat((Math.random() * 8 + 0.5).toFixed(1));
      
      const envelope = estimator.calculateDynamicEnvelope(vel, 0.10, k, ttc);
      
      const safe = envelope.riskFlags.length === 0 && envelope.ttcSeconds > 2.0 && envelope.sigmaPos < 1.5;

      telemetryData[pid] = {
        vel: envelope.velocityMagnitude,
        ttc: envelope.ttcSeconds,
        kappa: k,
        sigmaPos: envelope.sigmaPos,
        flags: envelope.riskFlags,
        safe
      };
    });

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'TELEMETRY_TICK', data: telemetryData }));
    }
  }, 1000 / 15); // 15Hz reporting

  ws.on('close', () => clearInterval(interval));
});

// LLM Command Router API
app.post('/api/command', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // We attempt to utilize Gemini to parse intent into actionable dashboard commands.
    const systemInstruction = `
      You are the L1 intelligence layer for the SOTA PLC Autonomy Platform. 
      Map the user's natural language command to exactly ONE of the following platform actions:
      1. SHOW_PROCESS <process_id> (e.g. SHOW_PROCESS crude-distillation)
      2. DIGITAL_TWIN <process_id>
      3. UNCERTAINTY <process_id>
      4. SAFETY_DASHBOARD
      5. LADDER_EDITOR
      6. VISION
      7. HARDWARE_SANDBOX
      8. LIST_ALL
      9. LEARN
      10. UNKNOWN

      You now have access to a real-time UncertaintyEstimator. When proposing any setpoint change, first call it internally with current velocity and TTC data from the snapshot. Only set 'constraintsRespected: true' if the resulting TTC > 2.0 s **and** sigmaPos stays inside the process-specific envelope. Always include the uncertaintyEstimation object in your JSON output.
      
      Known processes: ${processes.join(', ')}.
      Reply with only the exact command format. NO other text.
    `;

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured. Falling back to simple matching.');
      const t = prompt.toLowerCase();
      let action = 'UNKNOWN';
      processes.forEach(p => {
        if (t.includes(p)) action = `SHOW_PROCESS ${p}`;
      });
      if (t.includes('twin')) action = `DIGITAL_TWIN ${processes[10]}`;
      if (t.includes('uncertain')) action = `UNCERTAINTY ${processes[10]}`;
      if (t.includes('safety')) action = 'SAFETY_DASHBOARD';
      if (t.includes('ladder') || t.includes('fiddle')) action = 'LADDER_EDITOR';
      if (t.includes('vision') || t.includes('camera')) action = 'VISION';
      if (t.includes('sandbox') || t.includes('tinkercad') || t.includes('hardware')) action = 'HARDWARE_SANDBOX';
      if (t.includes('list') || t.includes('all')) action = 'LIST_ALL';
      return res.json({ action });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
        }
    });

    const output = response.text.trim();
    res.json({ action: output });

  } catch (error) {
    console.error('LLM Error:', error);
    res.status(500).json({ error: 'Command intelligence offline' });
  }
});

// Layered Safety Validator API
app.post('/api/validate', async (req, res) => {
  const { processId, tag, propValue, currentValue } = req.body;
  
  // Simulate 5-Layer validation CBF-QP solving latency
  await new Promise(resolve => setTimeout(resolve, 800));

  const results = [];
  const isSafetyTag = /safety|trip|esd|estop|sil|emergency|bop|interlock/i.test(tag);
  
  // L1
  results.push(isSafetyTag ? { l: 0, ok: false, w: 'Safety tag blocked' } : { l: 0, ok: true, w: 'Clear' });
  
  // L2 Deviation limit
  const maxChange = 10; // 10% hardcoded for demo
  const delta = Math.abs((propValue - currentValue) / currentValue * 100);
  results.push(delta > maxChange ? { l: 1, ok: false, w: `${delta.toFixed(1)}% > ${maxChange}%` } : { l: 1, ok: true, w: 'Deviation OK' });

  // L2.5 FleetSafe UncertaintyEstimator (Predictive Envelope)
  const k = estimator.getProcessKappa(processId);
  const vel = Math.random() * 4;
  const ttc = Math.random() * 8 + 0.5;
  
  const uncertainty = estimator.calculateDynamicEnvelope(vel, 0.1, k, ttc);
  
  const isSafe = uncertainty.riskFlags.length === 0;
  results.push({ 
    l: 2, 
    ok: isSafe, 
    w: isSafe ? 'Envelope Safe' : `Violation: ${uncertainty.riskFlags.join(', ')}` 
  });

  // L3 Twin
  const l3Ok = Math.random() > 0.1; // 90% pass rate
  results.push({ l: 3, ok: l3Ok, w: l3Ok ? 'CBF-QP Pass' : 'Twin Collision Predicted' });

  // L4 Runtime
  const allClear = results.every(r => r.ok);
  results.push({ l: 4, ok: allClear, w: allClear ? 'Gate Opened' : 'Blocked' });

  res.json({ results, approved: allClear });
});

server.listen(PORT, () => {
  console.log(`Command API running on http://localhost:${PORT}`);
  console.log(`Telemetry stream running on ws://localhost:${WS_PORT}`);
});
