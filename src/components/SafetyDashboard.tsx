// src/components/SafetyDashboard.tsx  ← full updated version (only new panel shown for brevity)
import React, { useEffect, useRef, useState } from 'react';

export default function SafetyDashboard() {
  const [processType] = useState('crude-distillation');
  const [proposal] = useState({ targetTag: 'furnace_temp', proposedValue: 320, uncertaintyEstimation: { ttcSeconds: 3.2, positionalCovariance: 1.1, velocityMagnitude: 0.8 } });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let angle = 0;
    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background robot/furnace icon (simple)
      ctx.fillStyle = '#111';
      ctx.fillRect(80, 80, 140, 140);

      // Dynamic covariance ring (FleetSafe-VLA style)
      const cov = proposal.uncertaintyEstimation.positionalCovariance || 1;
      ctx.strokeStyle = cov > 1.2 ? '#ff4444' : '#44ff88';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.strokeStyle;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(150, 150, 40 + i * 18 * cov, 40 + i * 18 * cov, angle + i * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // TTC countdown
      const ttc = proposal.uncertaintyEstimation.ttcSeconds || 0;
      ctx.fillStyle = ttc < 2 ? '#ff4444' : '#44ff88';
      ctx.font = 'bold 48px monospace';
      ctx.fillText(ttc.toFixed(1) + 's', 110, 170);

      angle += 0.02;
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [proposal]);

  return (
    <div className="p-6 bg-gray-900 text-white rounded-3xl">
      <h1 className="text-3xl font-bold mb-6">🛡️ FleetSafe-VLA Safety Dashboard</h1>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl">Live Uncertainty Envelope</h2>
          <canvas ref={canvasRef} width="300" height="300" className="bg-black rounded-2xl" />
          <p className="text-sm mt-2">Velocity-scaled covariance rings • TTC = {proposal.uncertaintyEstimation.ttcSeconds}s</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-3xl">
          <h3>Proposal Status (All 4 Layers + Uncertainty)</h3>
          <div className="space-y-3 mt-4 text-green-400">✅ Layer 1 LLM • ✅ Layer 2 Validator • ✅ Layer 3 SafetyTool • ✅ Layer 4 Go • ✅ FleetSafe-VLA Envelope</div>
          <button className="mt-8 w-full bg-emerald-600 py-5 rounded-2xl text-2xl font-bold">APPROVE SAFE CHANGE</button>
        </div>
      </div>
    </div>
  );
}
