import React, { useEffect, useRef } from 'react';

const CanvasBackground = ({ theme }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const CH = 'XYMQDTCIQ0123456789ABCDEF';
    let cols = [];
    let fs = 14;
    let mt = 0;
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = [];
      for (let i = 0; i < Math.ceil(canvas.width / fs); i++) {
        cols[i] = (Math.random() * canvas.height / fs) | 0;
      }
    };
    
    resize();
    window.addEventListener('resize', resize);

    const draw = (ts) => {
      if (ts - mt < 45) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      mt = ts;
      const isDark = theme !== 'light';

      ctx.fillStyle = isDark ? 'rgba(8,8,13,0.05)' : 'rgba(242,242,245,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fs}px monospace`;

      for (let i = 0; i < cols.length; i++) {
        const ch = CH[(Math.random() * CH.length) | 0];
        const x = i * fs;
        const y = cols[i] * fs;

        ctx.fillStyle = isDark ? 'rgba(0,229,160,0.08)' : 'rgba(0,0,0,0.035)';
        ctx.fillText(ch, x, y);

        if (cols[i] > 2) {
          ctx.fillStyle = isDark ? 'rgba(0,229,160,0.02)' : 'rgba(0,0,0,0.01)';
          ctx.fillText(CH[(Math.random() * CH.length) | 0], x, y - fs);
        }

        if (y > canvas.height && Math.random() > 0.975) {
          cols[i] = 0;
        }
        cols[i]++;
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: theme === 'light' ? 0.15 : 0.5,
        transition: 'opacity 0.4s'
      }}
    />
  );
};

export default CanvasBackground;
