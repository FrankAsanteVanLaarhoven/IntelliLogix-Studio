import React, { useState, useEffect } from 'react';
import CanvasBackground from './components/CanvasBackground';
import DigitalTwinCanvas from './components/DigitalTwinCanvas';
import UncertaintyDashboard from './components/UncertaintyDashboard';
import LadderLogicEditor from './components/LadderLogicEditor';
import VisionInferencePanel from './components/VisionInferencePanel';
import HardwareSandboxPanel from './components/HardwareSandboxPanel';
import DraggableWindow from './components/DraggableWindow';
import { processes, CategoryStyles, learnItems } from './utils/data';
import { useTelemetry } from './hooks/useTelemetry';
import './index.css';

const Toast = ({ msg, type }) => (
  <div style={{
    position: 'fixed', top: 12, right: 12, zIndex: 900, padding: '8px 12px',
    borderRadius: 8, fontSize: 10, fontWeight: 500,
    background: 'var(--sf)', backdropFilter: 'blur(12px)',
    border: `1px solid ${type === 'ok' ? 'var(--acm)' : type === 'er' ? 'rgba(255,59,92,0.2)' : 'var(--infs)'}`,
    color: type === 'ok' ? 'var(--ac)' : type === 'er' ? 'var(--dn)' : 'var(--inf)',
    animation: 'ti 0.25s ease, to 0.25s 2.8s forwards'
  }}>
    {type === 'ok' ? '✓' : type === 'er' ? '⚠' : 'ℹ'} {msg}
  </div>
);

const App = () => {
  const [theme, setTheme] = useState('system');
  const [started, setStarted] = useState(false);
  const [panels, setPanels] = useState([]);
  const [inputText, setInputText] = useState('');
  const [toast, setToast] = useState(null);
  
  // Real-time backend connection
  const { data: telemetryMap, connected: wsConnected } = useTelemetry();

  useEffect(() => {
    const applyTheme = () => {
      let resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      document.documentElement.setAttribute('data-theme', resolved);
    };
    applyTheme();
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  const showToast = (msg, type) => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const addPanel = (type, data = {}) => {
    setPanels(prev => [{ id: Date.now().toString(), type, data }, ...prev]);
  };

  const removePanel = (id) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  };

  const bringToFront = (id) => {
    setPanels(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const target = prev[idx];
      const newPanels = [...prev];
      newPanels.splice(idx, 1);
      newPanels.push(target);
      return newPanels;
    });
  };

  const handleCommand = async (cmd) => {
    const text = cmd.trim();
    if (!text) return;
    setInputText('');

    // Local overrides for UI buttons when backend is offline
    if (text === 'open hardware sandbox' || text === 'connect hardware') return addPanel('sandbox');
    if (text === 'open ladder editor') return addPanel('ladder');
    if (text === 'vision') return addPanel('vision');
    if (text.startsWith('twin')) return addPanel('twin', processes.find(p => p.id === text.split(' ')[1]) || processes[18]);
    if (text.startsWith('uncertainty')) return addPanel('uncertainty', processes.find(p => p.id === text.split(' ')[1]) || processes[18]);
    if (text === 'list all') return addPanel('list');
    if (text === 'safety query') {
      addPanel('safety', {});
      return showToast('Safety validators active', 'in');
    }

    try {
      showToast('Parsing intelligence...', 'in');
      const res = await fetch('http://localhost:3000/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      const json = await res.json();
      const actionParts = json.action ? json.action.split(' ') : [];
      const verb = actionParts[0];
      const target = actionParts.slice(1).join(' ');
      
      const pm = processes.find(p => p.id === target) || processes[18]; // Fallback

      if (verb === 'SHOW_PROCESS') return addPanel('process', pm);
      if (verb === 'DIGITAL_TWIN') return addPanel('twin', pm);
      if (verb === 'UNCERTAINTY') return addPanel('uncertainty', pm);
      if (verb === 'SAFETY_DASHBOARD') {
        addPanel('safety', {});
        return showToast('Safety validators active', 'in');
      }
      if (verb === 'LADDER_EDITOR') return addPanel('ladder');
      if (verb === 'VISION') return addPanel('vision');
      if (verb === 'HARDWARE_SANDBOX') return addPanel('sandbox');
      if (verb === 'LEARN') return addPanel('learn', { sec: learnItems[0] });
      if (verb === 'LIST_ALL') return addPanel('list');
      
      // Basic fallback
      addPanel('list');
      showToast('Could not map intention to module', 'er');

    } catch (err) {
      console.error(err);
      showToast('Backend LLM Offline', 'er');
    }
  };

  // Sub-components for panels
  const ProcessPanel = ({ id, p, onClose }) => {
    const catSt = CategoryStyles[p.cat];
    const liveTelemetry = telemetryMap[p.id];

    return (
      <div className="pg" style={{ animation: 'pi 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px 0', gap: '7px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: catSt?.color || 'var(--ac)' }}></span>
            #{p.n} {p.name}
          </span>
          <button style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 0, color: 'var(--t4)', cursor: 'pointer' }} onClick={() => onClose(id)}>✕</button>
        </div>
        <div style={{ padding: '9px 13px 13px' }}>
          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 8, fontFamily: 'monospace', fontWeight: 500, background: catSt?.bg, color: catSt?.color }}>{p.cat}</span>
          <p style={{ margin: '5px 0', fontSize: 10, color: 'var(--t2)', lineHeight: 1.45 }}>{p.desc}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, margin: '6px 0' }}>
            {['up', 'eff', 'oee'].map(k => (
              <div key={k} style={{ padding: '7px 3px', borderRadius: 6, background: 'var(--inp)', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ac)', fontFamily: 'monospace' }}>{p.kpi[k]}%</div>
                <div style={{ fontSize: 8, color: 'var(--t3)', marginTop: 1, textTransform: 'uppercase' }}>{k}</div>
              </div>
            ))}
          </div>
          
          <div style={{ background: 'var(--inp)', padding: 8, borderRadius: 6, marginTop: 8 }}>
            <div style={{ fontSize: 8, color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 4 }}>FleetSafe Telemetry Stream</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'monospace', color: 'var(--t3)' }}>
              <span>TTC Bounds</span>
              <span style={{ color: liveTelemetry?.safe ? 'var(--ac)' : 'var(--dn)' }}>{liveTelemetry?.ttc?.toFixed(1) || '--'} s</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
            {p.tw && <button onClick={() => addPanel('twin', p)} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--bd)', background: 0, color: 'var(--t3)', fontSize: 9, flex: 1, cursor: 'pointer' }}>Twin</button>}
            <button onClick={() => addPanel('uncertainty', p)} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--bd)', background: 0, color: 'var(--t3)', fontSize: 9, flex: 1, cursor: 'pointer' }}>Uncertainty</button>
            <button onClick={() => addPanel('proposal', p)} style={{ padding: '5px 9px', borderRadius: 6, border: '1px solid var(--bd)', background: 0, color: 'var(--t3)', fontSize: 9, flex: 1, cursor: 'pointer' }}>Propose</button>
          </div>
        </div>
      </div>
    );
  };

  const ProposalPanel = ({ id, p, onClose }) => {
    const [val, setVal] = useState(p ? 320 : 0);
    const [status, setStatus] = useState('idle');
    const [validationLayers, setValidationLayers] = useState([]);

    const baseVal = p.tags[0].includes('temp') ? 320 : p.tags[0].includes('speed') ? 75 : 50;

    const performValidation = async () => {
      setStatus('validating');
      try {
        const res = await fetch('http://localhost:3000/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processId: p.id, tag: p.tags[0], propValue: parseFloat(val), currentValue: baseVal })
        });
        const json = await res.json();
        
        // Stagger visual display of layers
        json.results.forEach((r, i) => {
          setTimeout(() => {
            setValidationLayers(prev => [...prev, r]);
            if (i === json.results.length - 1) {
              setStatus(json.approved ? 'done' : 'blocked');
              showToast(json.approved ? 'FleetSafe Validated' : 'Interlock Triggered', json.approved ? 'ok' : 'er');
            }
          }, (i + 1) * 350);
        });
      } catch (err) {
        console.error('Validation Error:', err);
        showToast('Validation backend offline', 'er');
        setStatus('idle');
      }
    };

    return (
      <DraggableWindow 
        id={id} title={`Propose — ${p?.name}`} iconColor="var(--wn)" defaultWidth={400} defaultHeight={270} defaultX={80} defaultY={80}
        onClose={() => onClose(id)} bringToFront={() => bringToFront(id)}
      >
        <div style={{ display: 'flex', gap: 5, marginBottom: 5, pointerEvents: 'auto' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, color: 'var(--t4)' }}>Current</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>{baseVal}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, color: 'var(--t4)' }}>Proposed</div>
              <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ width: '100%', padding: '7px 9px', background: 'var(--inp)', border: '1px solid var(--bd)', borderRadius: 6, color: 'var(--tx)', fontFamily: 'monospace', fontSize: 14 }} />
            </div>
          </div>

          <div style={{ marginTop: 8, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
             {validationLayers.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, background: 'var(--inp)', padding: 6, borderRadius: 4 }}>
                  <span style={{ color: 'var(--t3)' }}>L{i + 1}</span>
                  <span style={{ fontFamily: 'monospace', color: r.ok ? 'var(--ac)' : 'var(--dn)' }}>{r.w}</span>
                </div>
             ))}
          </div>

          <button 
            disabled={status !== 'idle'}
            onClick={performValidation} 
            style={{ width: '100%', padding: 9, border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: status === 'done' ? 'var(--bd)' : status === 'blocked' ? 'var(--dn)' : 'var(--ac)', color: status === 'done' ? 'var(--t3)' : '#08080D', pointerEvents: 'auto' }}>
            {status === 'idle' ? 'Submit for 5-Layer Validation' : status === 'validating' ? 'Computing Bounds...' : status === 'blocked' ? 'Blocked' : 'Published'}
          </button>
      </DraggableWindow>
    );
  };

  return (
    <>
      <CanvasBackground theme={theme} />
      
      {/* Theme Toggle */}
      <nav style={{ position: 'fixed', top: 14, right: 14, zIndex: 600, display: 'flex', background: 'var(--sf)', backdropFilter: `blur(var(--bl))`, border: '1px solid var(--bd)', borderRadius: 9, overflow: 'hidden' }}>
        <button onClick={() => setTheme('light')} style={{ width: 32, height: 30, border: 'none', background: theme === 'light' ? 'var(--acs)' : 0, color: theme === 'light' ? 'var(--ac)' : 'var(--t3)', cursor: 'pointer' }}>☼</button>
        <button onClick={() => setTheme('system')} style={{ width: 32, height: 30, border: 'none', background: theme === 'system' ? 'var(--acs)' : 0, color: theme === 'system' ? 'var(--ac)' : 'var(--t3)', cursor: 'pointer', fontSize: 14 }}>◐</button>
        <button onClick={() => setTheme('dark')} style={{ width: 32, height: 30, border: 'none', background: theme === 'dark' ? 'var(--acs)' : 0, color: theme === 'dark' ? 'var(--ac)' : 'var(--t3)', cursor: 'pointer' }}>☾</button>
      </nav>

      {/* Onboarding Screen */}
      {!started && (
        <div
          onClick={() => setStarted(true)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'opacity 0.7s', opacity: started ? 0 : 1 }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(145deg, var(--sf) 0%, var(--bg) 100%)',
            border: '1px solid var(--bd)', borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4), 0 0 30px rgba(0,229,160,0.1)',
            marginBottom: 28, position: 'relative'
          }}>
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="24" rx="5" stroke="var(--ac)" strokeWidth="2" />
              <path d="M12 4 L12 28 M20 4 L20 28" stroke="var(--ac)" strokeWidth="2" strokeDasharray="3 4" opacity="0.5" />
              <path d="M4 16 L28 16" stroke="var(--ac)" strokeWidth="2" />
              <circle cx="12" cy="16" r="3" fill="var(--bg)" stroke="var(--ac)" strokeWidth="2" />
              <circle cx="20" cy="16" r="3" fill="var(--ac)" />
            </svg>
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 48px)', fontWeight: 600, letterSpacing: '-0.03em' }}>IntelliLogix PLC Studio</h1>
          <p style={{ fontSize: 'clamp(11px, 1.5vw, 16px)', fontWeight: 300, color: 'var(--t3)', marginTop: 8 }}>Speak. The interface adapts.</p>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--t4)', marginTop: 24, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Manufacturing &middot; Mining &middot; Upstream &middot; Downstream &middot; 2026</p>
          <p style={{ fontSize: 12, color: 'var(--t2)', marginTop: 40, animation: 'pulse 2s infinite' }}>Click anywhere to enter</p>
        </div>
      )}

      {/* Main Container */}
      <main style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none', overflow: 'hidden' }}>
          {panels.map((panel, idx) => {
            const ix = 50 + (idx * 30) % 300;
            const iy = 50 + (idx * 30) % 200;

            if (panel.type === 'process') return (
              <DraggableWindow key={panel.id} id={panel.id} title={panel.data?.name} defaultWidth={680} defaultHeight={420} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <ProcessPanel id={panel.id} p={panel.data} onClose={removePanel} embedded />
              </DraggableWindow>
            );
            if (panel.type === 'twin') return (
              <DraggableWindow key={panel.id} id={panel.id} title={`Twin — ${panel.data?.name || 'Simulation'}`} iconColor="var(--inf)" defaultWidth={600} defaultHeight={460} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                  <DigitalTwinCanvas theme={theme} process={panel.data} />
                  <div style={{ marginTop: 4, fontSize: 8, color: 'var(--t4)', fontFamily: 'monospace' }}>SIMULATION</div>
                </div>
              </DraggableWindow>
            );
            if (panel.type === 'uncertainty') return (
              <DraggableWindow key={panel.id} id={panel.id} title={`FleetSafe — ${panel.data?.name || 'Monitor'}`} iconColor="var(--wn)" defaultWidth={600} defaultHeight={500} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', overflowY: 'auto' }}>
                  <UncertaintyDashboard theme={theme} process={panel.data} liveTelemetry={telemetryMap[panel.data?.id]} />
                </div>
              </DraggableWindow>
            );
            if (panel.type === 'proposal') return <ProposalPanel key={panel.id} id={panel.id} p={panel.data} onClose={removePanel} />;
            if (panel.type === 'list') return (
              <DraggableWindow key={panel.id} id={panel.id} title="Top 20 Processes" iconColor="var(--t2)" defaultWidth={420} defaultHeight={380} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ flex: 1, overflowY: 'auto', pointerEvents: 'auto', paddingRight: 4 }}>
                  {processes.map(p => (
                    <div key={p.id} onClick={() => handleCommand(`show ${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 6, cursor: 'pointer' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--t4)', width: 14 }}>{String(p.n).padStart(2, '0')}</span>
                      <span style={{ fontSize: 10, flex: 1, color: 'var(--t2)' }}>{p.name}</span>
                      <span style={{ background: CategoryStyles[p.cat]?.bg, color: CategoryStyles[p.cat]?.color, fontSize: 7, padding: '2px 6px', borderRadius: 4 }}>{p.cat.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </DraggableWindow>
            );
            if (panel.type === 'safety') return (
              <DraggableWindow key={panel.id} id={panel.id} title="Safety API Online" iconColor="var(--dn)" defaultWidth={420} defaultHeight={150} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ fontSize: 9, color: 'var(--t3)', pointerEvents: 'auto' }}>The FleetSafe Gateway API is actively listening on localhost:3000</div>
              </DraggableWindow>
            );
            if (panel.type === 'ladder') return (
              <DraggableWindow key={panel.id} id={panel.id} title="SOTA Logic Editor" iconColor="var(--ac)" defaultWidth={1000} defaultHeight={600} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', display: 'flex' }}>
                   <LadderLogicEditor theme={theme} />
                </div>
              </DraggableWindow>
            );
            if (panel.type === 'vision') return (
              <DraggableWindow key={panel.id} id={panel.id} title="VLA Inference Node" iconColor="var(--ac)" defaultWidth={730} defaultHeight={500} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                  <VisionInferencePanel />
                </div>
              </DraggableWindow>
            );
            if (panel.type === 'sandbox') return (
              <DraggableWindow key={panel.id} id={panel.id} title="Tinkercad-Style Hardware Sandbox" iconColor="var(--ac)" defaultWidth={1200} defaultHeight={750} defaultX={ix} defaultY={iy} onClose={() => removePanel(panel.id)} bringToFront={() => bringToFront(panel.id)}>
                <div style={{ pointerEvents: 'auto', width: '100%', height: '100%', display: 'flex' }}>
                  <HardwareSandboxPanel />
                </div>
              </DraggableWindow>
            );
            return null;
          })}
      </main>

      {/* Input Area */}
      {started && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 'min(580px, 86vw)', zIndex: 500 }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
            <button className="ch" onClick={() => handleCommand("open hardware sandbox")}>Hardware Sandbox</button>
            <button className="ch" onClick={() => handleCommand("connect hardware")}>Connect Hardware</button>
            <button className="ch" onClick={() => handleCommand("open ladder editor")}>Ladder</button>
            <button className="ch" onClick={() => handleCommand("vision")}>Camera Node</button>
            <button className="ch" onClick={() => handleCommand("show crude-distillation")}>Distillation</button>
            <button className="ch" onClick={() => handleCommand("uncertainty crude-distillation")}>Uncertainty</button>
            <button className="ch" onClick={() => handleCommand("safety query")}>Safety</button>
            <button className="ch" onClick={() => handleCommand("twin mining-conveyor")}>Digital Twin</button>
            <button className="ch" onClick={() => handleCommand("list all")}>All 20</button>
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              id="main-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand(inputText)}
              placeholder="Describe what you need..."
              autoComplete="off"
              style={{ width: '100%', padding: '11px 40px 11px 14px', background: 'var(--sf)', backdropFilter: 'blur(28px)', border: '1px solid var(--bd)', borderRadius: 11, color: 'var(--tx)', fontSize: 12, outline: 'none' }}
            />
            <button style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: 7, border: 'none', background: 0, color: 'var(--t3)', cursor: 'pointer', fontSize: 12 }}>🎤</button>
          </div>
        </div>
      )}

      {/* Footer */}
      {started && (
        <footer style={{ position: 'fixed', bottom: 3, left: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 7, fontSize: 8, fontFamily: 'monospace', color: 'var(--t4)' }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: wsConnected ? 'var(--ac)' : 'var(--dn)', animation: wsConnected ? 'sdb 2.5s infinite' : 'none' }}></span>
          <span>{wsConnected ? 'MQTT LIVE' : 'DISCONNECTED'}</span>
          <span style={{ color: 'var(--t4)' }}>|</span>
          <span>{panels.length} PANELS</span>
        </footer>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </>
  );
};

export default App;
