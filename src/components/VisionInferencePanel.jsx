import React, { useEffect, useRef, useState } from 'react';

export default function VisionInferencePanel() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [velocity, setVelocity] = useState(0);

  useEffect(() => {
    let stream = null;
    let animationId = null;
    let prevFrame = null;

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    };

    initCamera();

    const drawHUD = () => {
      const cvs = canvasRef.current;
      const vid = videoRef.current;
      if (!cvs || !vid || vid.videoWidth === 0) {
        animationId = requestAnimationFrame(drawHUD);
        return;
      }

      cvs.width = vid.videoWidth;
      cvs.height = vid.videoHeight;
      const ctx = cvs.getContext('2d');

      // Pseudo Optical Flow - Mocking rapid change for visual demo
      // In production, we'd use a lightweight WebAssembly CNN here
      const time = Date.now() / 1000;
      const mockVelocity = Math.abs(Math.sin(time * 3)) * 4.5 + Math.random() * 0.5;
      setVelocity(mockVelocity.toFixed(2));

      // Draw Tesla FSD style bounds
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Scanning reticle
      const scanY = (time * 150) % cvs.height;
      ctx.fillStyle = 'rgba(0, 229, 160, 0.15)';
      ctx.fillRect(0, scanY, cvs.width, 4);

      // Bounding Box Mock (tracking a moving object)
      const boxX = cvs.width / 2 + Math.sin(time) * 100 - 50;
      const boxY = cvs.height / 2 + Math.cos(time * 1.5) * 50 - 50;
      
      const isDangerous = mockVelocity > 2.5;

      ctx.strokeStyle = isDangerous ? '#FF3B5C' : '#00E5A0';
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 5]);
      ctx.strokeRect(boxX, boxY, 100, 100);
      ctx.setLineDash([]);

      ctx.fillStyle = isDangerous ? '#FF3B5C' : '#00E5A0';
      ctx.font = '16px monospace';
      ctx.fillText(`AGENT_01 [vel: ${mockVelocity.toFixed(1)}]`, boxX, boxY - 8);

      animationId = requestAnimationFrame(drawHUD);
    };

    videoRef.current?.addEventListener('loadeddata', () => {
      drawHUD();
    });

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300, background: '#000', borderRadius: 8, overflow: 'hidden' }}>
      {!hasCamera && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontFamily: 'monospace' }}>
          Requesting Hardware Stream...
        </div>
      )}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
      />
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />
      
      {/* HUD Overlay Stats */}
      <div style={{ position: 'absolute', top: 12, left: 12, padding: '6px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: 6, backdropFilter: 'blur(4px)', border: '1px solid var(--bd)' }}>
        <div style={{ fontSize: 10, color: 'var(--t3)' }}>Optical Velocity (∥vo∥)</div>
        <div style={{ fontFamily: 'monospace', fontSize: 18, color: velocity > 2.5 ? 'var(--dn)' : 'var(--ac)', fontWeight: 600 }}>{velocity} m/s</div>
      </div>

      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--dn)', borderRadius: 4, fontFamily: 'monospace', color: '#000', fontWeight: 700 }}>REC</span>
        <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--ac)', borderRadius: 4, fontFamily: 'monospace', color: '#000', fontWeight: 700 }}>VLA NODE 01</span>
      </div>
    </div>
  );
}
