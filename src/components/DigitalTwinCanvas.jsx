import React, { useEffect, useRef } from 'react';
import { CategoryStyles } from '../utils/data';
import { useBackplane } from '../context/BackplaneContext';

const DigitalTwinCanvas = ({ theme, process }) => {
  const canvasRef = useRef(null);
  const { globalMemory, updateMemory } = useBackplane();
  const memoryRef = useRef(globalMemory);
  
  // Keep ref up to date natively without refiring useEffect reset
  useEffect(() => { memoryRef.current = globalMemory; }, [globalMemory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let t = 0;
    let animationFrameId;

    const w = canvas.width;
    const h = canvas.height;
    const tw = process?.tw || 'conveyor';

    const tca = (a) => theme !== 'light' ? `rgba(0,229,160,${a})` : `rgba(0,120,80,${a})`;
    const ttx = (a) => theme !== 'light' ? `rgba(200,210,220,${a})` : `rgba(10,10,20,${a})`;
    const tac = (a, c) => {
      const m = {
        accent: theme !== 'light' ? `rgba(0,229,160,${a})` : `rgba(0,120,80,${a})`,
        info: theme !== 'light' ? `rgba(0,184,212,${a})` : `rgba(0,120,160,${a})`,
        warn: theme !== 'light' ? `rgba(232,160,0,${a})` : `rgba(160,110,0,${a})`,
        danger: theme !== 'light' ? `rgba(255,59,92,${a})` : `rgba(200,30,60,${a})`
      };
      return m[c] || m.accent;
    };

    const tlb = (ctx, x, y, text, aColor) => {
      ctx.font = "7px monospace";
      ctx.fillStyle = aColor || ttx(0.35); // increased contrast for text
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
    };

    const tfl = (ctx, x, y, dx, dy, n, t, ca) => {
      for (let i = 0; i < n; i++) {
        const o = (t * 28 + i * (55 / n)) % 55;
        const px = x + dx * o;
        const py = y + dy * o;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(-1, -2);
        ctx.lineTo(-1, 2);
        ctx.closePath();
        ctx.fillStyle = ca || tca(0.25);
        ctx.fill();
        ctx.restore();
      }
    };

    const tgr = (ctx, x, y, r, te, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < te; i++) {
        const a1 = i / te * Math.PI * 2;
        const a2 = (i + 0.3) / te * Math.PI * 2;
        const a3 = (i + 0.5) / te * Math.PI * 2;
        const a4 = (i + 0.8) / te * Math.PI * 2;
        const ri = r * 0.7;
        if (i === 0) ctx.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
        ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
        ctx.lineTo(Math.cos(a3) * ri, Math.sin(a3) * ri);
        ctx.lineTo(Math.cos(a4) * ri, Math.sin(a4) * ri);
      }
      ctx.closePath();
      ctx.fillStyle = tca(0.1);
      ctx.fill();
      ctx.strokeStyle = tca(0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      
      // Drive simulation ONLY if Logic Ladder computes a TRUE output. (Sim2Val)
      // Checks for either Output_1 or Motor_Cmd to support standard PLC conventions
      if (memoryRef.current['Output_1'] || memoryRef.current['Motor_Cmd'] || memoryRef.current['Pump_Cmd']) {
        t += 0.02;
      }

      if (tw === 'conveyor') {
        const by = h * 0.5;
        ctx.fillStyle = tca(0.02);
        ctx.fillRect(30, by - 5, w - 60, 10);
        ctx.strokeStyle = tca(0.18);
        ctx.lineWidth = 1;
        ctx.strokeRect(30, by - 5, w - 60, 10);
        tgr(ctx, 55, by, 14, 8, t * 2);
        tgr(ctx, w - 55, by, 14, 8, -t * 2);
        
        let sensorActive = false;
        for (let i = 0; i < 5; i++) {
          const bx = ((t * 45 + i * 80) % (w - 130)) + 65;
          ctx.strokeStyle = tca(0.25);
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by - 14, 18, 10);
          
          if (w * 0.7 >= bx && w * 0.7 <= bx + 18) sensorActive = true;
        }
        ctx.fillStyle = sensorActive ? tac(0.9, 'warn') : tac(0.18, 'warn');
        ctx.fillRect(w * 0.7, by - 28, 2, 14);
        
        // Broadcast the physical state back to the hardware backplane seamlessly
        updateMemory('Input_1', sensorActive);
        
        tlb(ctx, w * 0.7 + 1, by - 38, 'SENSOR', tac(0.35, 'warn'));
        tfl(ctx, 80, by, 1, 0, 3, t);
        tlb(ctx, 55, by + 18, 'MOTOR', ttx(0.35));
        tlb(ctx, w - 55, by + 18, 'DRIVE', ttx(0.35));
        tlb(ctx, w / 2, h - 5, 'CONVEYOR — LIVE', ttx(0.35));
      } else if (tw === 'distillation') {
        const cx = w * 0.5, cW = 28, cT = 26, cH = 140;
        ctx.strokeStyle = tca(0.25);
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - cW / 2, cT, cW, cH);
        const lv = 0.4 + Math.sin(t * 0.5) * 0.1, lY = cT + cH * (1 - lv);
        ctx.fillStyle = tca(0.04);
        ctx.fillRect(cx - cW / 2 + 1, lY, cW - 2, cT + cH - lY - 1);
        tlb(ctx, cx, cT - 10, 'CONDENSER', tac(0.3, 'info'));
        tlb(ctx, cx, cT + cH + 12, 'FURNACE', tac(0.3, 'danger'));
        const ps = [
          { y: cT + cH * 0.2, l: 'GAS', c: 'info', d: -1 },
          { y: cT + cH * 0.5, l: 'DIESEL', c: 'warn', d: 1 },
          { y: cT + cH * 0.85, l: 'RESIDUE', c: 'danger', d: 1 }
        ];
        ps.forEach(pp => {
          const ex = cx + pp.d * (cW / 2 + 35);
          ctx.beginPath();
          ctx.moveTo(cx + pp.d * cW / 2, pp.y);
          ctx.lineTo(ex, pp.y);
          ctx.strokeStyle = tac(0.35, pp.c);
          ctx.lineWidth = 1;
          ctx.stroke();
          tfl(ctx, cx + pp.d * cW / 2, pp.y, pp.d, 0, 2, t, tac(0.18, pp.c));
          tlb(ctx, ex + pp.d * 16, pp.y + 3, pp.l, tac(0.4, pp.c));
        });
        
        // Pass a condenser trigger based on logic thresholds 
        updateMemory('Input_1', lv > 0.45);
        
        tlb(ctx, cx, cT + cH + 32, 'DISTILLATION — LIVE', ttx(0.35));
      } else if (tw === 'wellhead') {
        const cx = w * 0.45;
        ctx.strokeStyle = tca(0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, h * 0.1); ctx.lineTo(cx, h * 0.7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, h * 0.24); ctx.lineTo(cx - 35, h * 0.24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, h * 0.24); ctx.lineTo(cx + 35, h * 0.24); ctx.stroke();
        const cy = h * 0.48;
        ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 8, cy + 3); ctx.lineTo(cx + 8, cy + 3); ctx.closePath();
        ctx.fillStyle = tac(0.1, 'warn'); ctx.fill(); ctx.strokeStyle = tac(0.35, 'warn'); ctx.stroke();
        tlb(ctx, cx + 20, cy + 3, 'CHOKE', tac(0.35, 'warn'));
        ctx.strokeStyle = tac(0.25, 'info'); ctx.lineWidth = 1; ctx.strokeRect(cx - 18, h * 0.64, 36, 28);
        tlb(ctx, cx, h * 0.64 + 14, 'SEP', tac(0.3, 'info'));
        tfl(ctx, cx, h * 0.14, 0, 1, 3, t);
        
        // Emulate pressure switch cycle
        updateMemory('Input_1', Math.sin(t * 3) > 0.5);
        
        tlb(ctx, cx, h - 5, 'WELLHEAD — LIVE', ttx(0.35));
      } else if (tw === 'pump') {
        const cx = w * 0.4, cy = h * 0.44;
        ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fillStyle = tca(0.04); ctx.fill(); ctx.strokeStyle = tca(0.3); ctx.lineWidth = 1; ctx.stroke();
        for (let i = 0; i < 4; i++) {
          const a = t * 3 + i * Math.PI / 2;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
          ctx.strokeStyle = tca(0.2); ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(cx - 44, cy); ctx.lineTo(cx - 22, cy); ctx.strokeStyle = tac(0.25, 'info'); ctx.lineWidth = 2; ctx.stroke();
        tfl(ctx, cx - 40, cy, 1, 0, 2, t, tac(0.15, 'info'));
        ctx.beginPath(); ctx.moveTo(cx + 22, cy); ctx.lineTo(cx + 56, cy); ctx.strokeStyle = tca(0.25); ctx.lineWidth = 2; ctx.stroke();
        tfl(ctx, cx + 26, cy, 1, 0, 2, t);
        
        // Pump flow active toggle
        updateMemory('Input_1', true);
        
        tlb(ctx, cx, h - 5, 'PUMP — LIVE', ttx(0.35));
      } else if (tw === 'separator') {
        const cx = w * 0.5, cy = h * 0.38;
        ctx.beginPath(); ctx.ellipse(cx, cy, 60, 24, 0, 0, Math.PI * 2);
        ctx.fillStyle = tac(0.02, 'info'); ctx.fill(); ctx.strokeStyle = tac(0.25, 'info'); ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = tca(0.03); ctx.fillRect(cx - 58, cy + 5, 116, 18);
        [{ y: cy - 20, l: 'GAS', c: 'info' }, { y: cy, l: 'OIL', c: 'accent' }, { y: cy + 18, l: 'WATER', c: 'info' }].forEach(o => {
          ctx.beginPath(); ctx.moveTo(cx + 60, o.y); ctx.lineTo(cx + 90, o.y);
          ctx.strokeStyle = tac(0.35, o.c); ctx.lineWidth = 1; ctx.stroke();
          tlb(ctx, cx + 105, o.y + 3, o.l, tac(0.4, o.c));
        });
        tlb(ctx, cx, h - 5, 'SEPARATOR — LIVE', ttx(0.35));
      } else if (tw === 'ventilation') {
        [{ x: w * 0.2, y: h * 0.34 }, { x: w * 0.5, y: h * 0.29 }, { x: w * 0.8, y: h * 0.34 }].forEach((f, i) => {
          ctx.beginPath(); ctx.arc(f.x, f.y, 16, 0, Math.PI * 2);
          ctx.fillStyle = tca(0.02); ctx.fill(); ctx.strokeStyle = tca(0.2); ctx.stroke();
          for (let b = 0; b < 3; b++) {
            const a = t * 2 + b * Math.PI * 2 / 3;
            ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * 12, f.y + Math.sin(a) * 12);
            ctx.strokeStyle = tca(0.18); ctx.lineWidth = 1; ctx.stroke();
          }
          tlb(ctx, f.x, f.y + 24, 'FAN ' + (i + 1), ttx(0.35));
          tfl(ctx, f.x, f.y - 18, 0, -1, 2, t);
        });
        tlb(ctx, w * 0.5, h - 5, 'VENTILATION — LIVE', ttx(0.35));
      } else if (tw === 'hvac') {
        [{ x: w * 0.15, l: 'Z1' }, { x: w * 0.5, l: 'Z2' }, { x: w * 0.85, l: 'Z3' }].forEach(z => {
          ctx.strokeStyle = tac(0.22, 'info'); ctx.lineWidth = 1; ctx.strokeRect(z.x - 26, h * 0.24, 52, 36);
          tlb(ctx, z.x, h * 0.24 + 18, z.l, tac(0.22, 'info'));
          tlb(ctx, z.x, h * 0.24 + 46, (22 + Math.sin(t * 0.3 + z.x) * 2).toFixed(1) + '°C', tac(0.4, 'info'));
        });
        tlb(ctx, w * 0.5, h - 5, 'HVAC — LIVE', ttx(0.35));
      } else if (tw === 'robotic') {
        const cx = w * 0.5, by = h * 0.74;
        ctx.strokeStyle = tca(0.4); ctx.lineWidth = 2;
        const a1 = Math.sin(t * 0.8) * 0.3 - 0.5, a2 = Math.sin(t * 1.2 + 1) * 0.4;
        const j2x = cx + Math.sin(a1) * 50, j2y = by - Math.cos(a1) * 50;
        const ex = j2x + Math.sin(a1 + a2) * 42, ey = j2y - Math.cos(a1 + a2) * 42;
        ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(j2x, j2y); ctx.lineTo(ex, ey); ctx.stroke();
        [[cx, by, 3], [j2x, j2y, 3], [ex, ey, 2]].forEach(j => {
          ctx.beginPath(); ctx.arc(j[0], j[1], j[2], 0, Math.PI * 2);
          ctx.fillStyle = tca(0.12); ctx.fill(); ctx.strokeStyle = tca(0.45); ctx.lineWidth = 1; ctx.stroke();
        });
        ctx.beginPath(); ctx.arc(cx, by - 44, 70, 0, Math.PI * 2);
        ctx.strokeStyle = tac(0.05, 'danger'); ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
        tlb(ctx, cx, by - 90, 'SAFETY', tac(0.18, 'danger'));
        tlb(ctx, cx, h - 5, 'ROBOTIC — LIVE', ttx(0.35));
      } else if (tw === 'batch') {
        const cx = w * 0.5, cy = h * 0.38;
        ctx.strokeStyle = tac(0.25, 'warn'); ctx.lineWidth = 1; ctx.strokeRect(cx - 30, cy - 28, 60, 56);
        const lv = 0.5 + Math.sin(t * 0.2) * 0.1, lY = cy + 28 - 56 * (1 - lv);
        ctx.fillStyle = tac(0.03, 'warn'); ctx.fillRect(cx - 29, lY, 58, cy + 27 - lY);
        ctx.beginPath(); ctx.moveTo(cx, cy - 36); ctx.lineTo(cx, cy + 10); ctx.strokeStyle = ttx(0.12); ctx.lineWidth = 1; ctx.stroke();
        const phInt = Math.floor((t * 0.15) % 5);
        const ph = ['CHARGE', 'HEAT', 'REACT', 'COOL', 'DISCHARGE'];
        
        // Trigger high limit alarm randomly based on animation bounds
        updateMemory('Input_1', phInt === 2);
        
        tlb(ctx, cx, cy + 38, 'PHASE: ' + ph[phInt], tac(0.45, 'warn'));
        tlb(ctx, cx, h - 5, 'BATCH — LIVE', ttx(0.35));
      } else if (tw === 'blending') {
        const cx = w * 0.5;
        ctx.beginPath(); ctx.arc(cx, h * 0.44, 24, 0, Math.PI * 2);
        ctx.fillStyle = tca(0.02); ctx.fill(); ctx.strokeStyle = tca(0.25); ctx.stroke();
        [{ x: cx - 60, y: h * 0.24, l: 'A', c: 'accent' }, { x: cx, y: h * 0.1, l: 'B', c: 'info' }, { x: cx + 60, y: h * 0.24, l: 'CAT', c: 'warn' }].forEach(f => {
          ctx.beginPath(); ctx.moveTo(f.x, f.y + 5); ctx.lineTo(cx, h * 0.44 - 24); ctx.strokeStyle = tac(0.2, f.c); ctx.lineWidth = 1; ctx.stroke();
          tfl(ctx, f.x, f.y + 2, (cx - f.x) * 0.006, 0.01, 2, t, tac(0.12, f.c));
          tlb(ctx, f.x, f.y, f.l, tac(0.35, f.c));
        });
        ctx.beginPath(); ctx.moveTo(cx, h * 0.44 + 24); ctx.lineTo(cx, h * 0.64); ctx.strokeStyle = tca(0.25); ctx.stroke();
        tfl(ctx, cx, h * 0.52, 0, 1, 2, t);
        tlb(ctx, cx, h * 0.68, 'PRODUCT', tca(0.4));
        tlb(ctx, cx, h - 5, 'BLEND — LIVE', ttx(0.35));
      } else {
        tlb(ctx, w * 0.5, h * 0.5, 'SIM', ttx(0.2));
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, process]);

  return <canvas ref={canvasRef} className="tc" width={560} height={240} style={{ width: '100%', borderRadius: 6, background: 'var(--inp)' }} />;
};

export default DigitalTwinCanvas;
