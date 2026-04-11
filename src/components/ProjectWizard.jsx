import React, { useState } from 'react';
import { Sparkles, ArrowRight, Cpu, Layout, Battery, CheckCircle } from 'lucide-react';

export default function ProjectWizard({ onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [platform, setPlatform] = useState('plc');

  // Need Factory icon
  const Factory = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
  );

  const platforms = [
    { id: 'plc', name: 'Industrial PLC', icon: Factory, desc: 'S7-1500, Allen Bradley, Omron' },
    { id: 'mcu', name: 'Microcontroller', icon: Cpu, desc: 'Arduino, ESP32, STM32' },
    { id: 'mixed', name: 'Hybrid System', icon: Layout, desc: 'IoT + Edge Compute + PLC' }
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setStep(1);
    }, 2500);
  };

  const handleLaunch = () => {
    onComplete({ platform, prompt });
  };

  return (
    <div className="pg" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--bd)', background: 'var(--sfh)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="var(--ac)" />
          AI Studio Wizard
        </h2>
        <button onClick={onClose} style={{ background: 0, border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {step === 0 && (
          <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, animation: 'ti 0.4s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Describe your ambition.</h1>
              <p style={{ color: 'var(--t2)', fontSize: 13 }}>Our SOTA AI will architect the hardware layout, baseline PLC logic, and initialize real-time twins.</p>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', paddingBottom: 8, display: 'block' }}>TARGET PLATFORM</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {platforms.map((p) => {
                  const Icon = p.icon;
                  return (
                  <button 
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    style={{ 
                      background: platform === p.id ? 'var(--acm)' : 'var(--sf)', 
                      border: `1px solid ${platform === p.id ? 'var(--ac)' : 'var(--bd)'}`,
                      borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      cursor: 'pointer', transition: 'all 0.2s',
                      color: platform === p.id ? 'var(--ac)' : 'var(--tx)'
                    }}
                  >
                    <Icon size={24} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                  </button>
                )})}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', paddingBottom: 8, display: 'block' }}>NATURAL LANGUAGE PROMPT</label>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. Build an automated sorting conveyor that uses an ESP32 for vision detection and an S7-1500 for motor control."
                style={{
                  width: '100%', height: 120, background: 'var(--inp)', border: '1px solid var(--bd)', 
                  borderRadius: 12, padding: 16, color: 'var(--tx)', fontSize: 14, fontFamily: 'monospace',
                  resize: 'none', outline: 'none'
                }}
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!prompt || isGenerating}
              style={{
                width: '100%', padding: '14px', background: isGenerating ? 'var(--bd)' : 'var(--ac)', color: '#000',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: (!prompt || isGenerating) ? 0.5 : 1
              }}
            >
              {isGenerating ? <div style={{ animation: 'pulse 1s infinite' }}>Synthesizing Topology...</div> : <>Generate Architecture <ArrowRight size={16} /></>}
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, animation: 'ti 0.5s ease' }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--acm)', border: '2px solid var(--ac)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--ac)' }}>
                <CheckCircle size={32} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Scaffolding Complete.</h1>
              <p style={{ color: 'var(--t2)', fontSize: 13 }}>AI has provisioned your virtual hardware, pre-configured the ladder networks, and initialized the UI elements.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--inp)', padding: 16, borderRadius: 12, border: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--tx)', fontSize: 13 }}><CheckCircle size={16} color="var(--ac)" /> Generated 6 Rung Logic Blocks</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--tx)', fontSize: 13 }}><CheckCircle size={16} color="var(--ac)" /> Patched Memory Addresses (14 Tags)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--tx)', fontSize: 13 }}><CheckCircle size={16} color="var(--ac)" /> Configured Interactive Routing Config</div>
            </div>

            <button 
              onClick={handleLaunch}
              style={{
                width: '100%', padding: '14px', background: 'var(--tx)', color: 'var(--bg)',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              Enter IDE Sandbox
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
