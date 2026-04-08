import React, { useEffect, useRef, useState } from 'react';
import { UE } from '../utils/data';

const UncertaintyDashboard = ({ theme, process }) => {
  const canvasRef = useRef(null);
  const [stats, setStats] = useState({ sig: 0, ttc: 0, kap: 0, vel: 0, flags: [], safe: true });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    let t = 0;
    let animationFrameId;

    const tca = (a) => theme !== 'light' ? `rgba(0,229,160,${a})` : `rgba(0,120,80,${a})`;
    const ttx = (a) => theme !== 'light' ? `rgba(200,210,220,${a})` : `rgba(10,10,20,${a})`;
    const tac = (a, c) => {
      const m = {
        accent: theme !== 'light' ? `rgba(0,229,160,${a})` : `rgba(0,120,80,${a})`,
        warn: theme !== 'light' ? `rgba(232,160,0,${a})` : `rgba(160,110,0,${a})`,
        danger: theme !== 'light' ? `rgba(255,59,92,${a})` : `rgba(200,30,60,${a})`
      };
      return m[c] || m.accent;
    };

    const tlb = (ctx, y, text, aColor) => {
      ctx.font = "7px monospace";
      ctx.fillStyle = aColor || ttx(0.25);
      ctx.textAlign = 'center';
      ctx.fillText(text, cx, y);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.03;

      const ue = UE.snapshot(process?.id || 'crude-distillation');
      // Throttling stat updates for React to avoid crazy render loops
      if (Math.round(t * 100) % 15 === 0) {
        setStats({
          sig: ue.sigmaPos,
          ttc: ue.ttc,
          kap: ue.kappa,
          vel: ue.vel,
          flags: ue.flags,
          safe: ue.safe
        });
      }

      const maxR = Math.min(cx, cy) - 20;

      // Base ring
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, maxR * 0.15), 0, Math.PI * 2);
      ctx.strokeStyle = tca(0.12);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      tlb(ctx, cy + maxR * 0.15 + 10, 'σbase', ttx(0.2));

      // Dynamic envelope ring
      const sigNorm = Math.min(ue.sigmaPos / 2, 1);
      const dynR = Math.max(1, maxR * (0.15 + sigNorm * 0.65));
      const envColor = ue.safe ? tca(0.35) : (ue.flags.includes('TTC_CRITICAL') ? tac(0.4, 'danger') : tac(0.4, 'warn'));
      
      ctx.beginPath();
      ctx.arc(cx, cy, dynR, 0, Math.PI * 2);
      ctx.strokeStyle = envColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, dynR, 0, Math.PI * 2);
      ctx.fillStyle = ue.safe ? tca(0.04) : tac(0.06, 'danger');
      ctx.fill();

      // Critical ring
      const critR = Math.max(1, maxR * (0.15 + UE.sigmaCritical / 2 * 0.65));
      ctx.beginPath();
      ctx.arc(cx, cy, critR, 0, Math.PI * 2);
      ctx.strokeStyle = tac(0.08, 'danger');
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      tlb(ctx, cy + critR + 8, 'CRITICAL', tac(0.2, 'danger'));

      // Velocity vector
      const vAngle = t * 0.5;
      const vLen = Math.min(ue.vel / 5, 1) * maxR * 0.6;
      const vx = cx + Math.cos(vAngle) * vLen;
      const vy = cy + Math.sin(vAngle) * vLen;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx, vy);
      ctx.strokeStyle = tac(0.5, 'warn'); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(vx, vy, 3, 0, Math.PI * 2);
      ctx.fillStyle = tac(0.6, 'warn'); ctx.fill();
      ctx.font = "7px monospace"; ctx.fillText('vₒ', vx + 12, vy);

      // TTC Arc
      const ttcFrac = Math.min(ue.ttc / 10, 1);
      const ttcR = Math.max(1, maxR * 0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, ttcR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ttcFrac);
      ctx.strokeStyle = ue.ttc > 2 ? tca(0.25) : tac(0.4, 'danger');
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(cx, cy, ttcR, 0, Math.PI * 2);
      ctx.strokeStyle = tca(0.06);
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center label
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = ue.safe ? tca(0.7) : tac(0.7, 'danger');
      ctx.textAlign = 'center';
      ctx.fillText(ue.ttc.toFixed(1) + 's', cx, cy + 4);
      ctx.font = "7px monospace";
      ctx.fillStyle = ttx(0.25);
      ctx.fillText('TTC', cx, cy + 14);

      if (process) {
        tlb(ctx, h - 6, `${process.name.toUpperCase()} — FLEETSAFE LIVE`, ttx(0.2));
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [theme, process]);

  return (
    <div style={{ padding: '9px 13px 13px' }}>
      <canvas ref={canvasRef} width={560} height={200} style={{ width: '100%', borderRadius: 6, background: 'var(--inp)' }} />
      <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
        <div style={{ padding: '7px 3px', borderRadius: '6px', background: 'var(--inp)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: stats.safe ? 'var(--ac)' : 'var(--dn)', fontFamily: 'monospace' }}>{stats.sig.toFixed(3)}</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', textTransform: 'uppercase' }}>σpos</div>
        </div>
        <div style={{ padding: '7px 3px', borderRadius: '6px', background: 'var(--inp)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: stats.ttc > 2 ? 'var(--ac)' : 'var(--dn)', fontFamily: 'monospace' }}>{stats.ttc.toFixed(1)}</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', textTransform: 'uppercase' }}>TTC (s)</div>
        </div>
        <div style={{ padding: '7px 3px', borderRadius: '6px', background: 'var(--inp)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ac)', fontFamily: 'monospace' }}>{stats.kap.toFixed(2)}</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', textTransform: 'uppercase' }}>κ</div>
        </div>
        <div style={{ padding: '7px 3px', borderRadius: '6px', background: 'var(--inp)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ac)', fontFamily: 'monospace' }}>{stats.vel.toFixed(2)}</div>
          <div style={{ fontSize: '8px', color: 'var(--t3)', textTransform: 'uppercase' }}>||v||</div>
        </div>
      </div>
      <div style={{ marginTop: '5px' }}>
        {stats.flags.length > 0 ? stats.flags.map((f, i) => {
          const c = f === 'TTC_CRITICAL' ? 'var(--dn)' : f === 'HIGH_UNCERTAINTY' ? 'var(--wn)' : 'var(--inf)';
          const bg = f === 'TTC_CRITICAL' ? 'var(--dns)' : f === 'HIGH_UNCERTAINTY' ? 'var(--wns)' : 'var(--infs)';
          return <span key={i} style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, fontFamily: 'monospace', background: bg, color: c, marginRight: '4px' }}>{f}</span>;
        }) : <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 600, fontFamily: 'monospace', background: 'var(--acs)', color: 'var(--ac)' }}>NOMINAL</span>}
      </div>
      <div style={{ marginTop: '5px', fontSize: '8px', color: 'var(--t4)', fontFamily: 'monospace' }}>
        σpos = σbase + κ · ||vₒ|| · TTC &lt; 2.0s = critical
      </div>
    </div>
  );
};

export default UncertaintyDashboard;
