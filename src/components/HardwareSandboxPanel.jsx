import React, { useState, useEffect, useRef } from 'react';
import { processes } from '../utils/data';
import { useWebSerial } from '../hooks/useWebSerial';
import { useBackplane } from '../context/BackplaneContext';
import { 
  Cpu, Activity, Settings, Square, Zap, Lightbulb, 
  Hexagon, CircleDashed, Radar, Eye, Battery, PowerOff,
  Factory
} from 'lucide-react';

const COMPONENT_LIBRARY = [
  { id: 'c1', name: 'Arduino Uno R3', type: 'mcu', icon: Cpu, color: '#2563eb' },
  { id: 'c2', name: 'Micro:bit', type: 'mcu', icon: Activity, color: '#d97706' },
  { id: 'c3', name: 'PLC S7-1500 OS', type: 'plc', icon: Settings, color: '#059669' },
  { id: 'c4', name: 'Breadboard Small', type: 'board', icon: Square, color: '#6b7280' },
  { id: 'c5', name: 'Resistor', type: 'passive', icon: Zap, color: '#dc2626' },
  { id: 'c6', name: 'LED RGB', type: 'output', icon: Lightbulb, color: '#000000' },
  { id: 'c7', name: 'Micro Servo', type: 'motor', icon: Hexagon, color: '#7c3aed' },
  { id: 'c8', name: 'DC Motor', type: 'motor', icon: CircleDashed, color: '#475569' },
  { id: 'c9', name: 'Ultrasonic Dist.', type: 'sensor', icon: Radar, color: '#4b5563' },
  { id: 'c10', name: 'PIR Sensor', type: 'sensor', icon: Eye, color: '#0d9488' },
  { id: 'c11', name: '9V Battery', type: 'power', icon: Battery, color: '#16a34a' },
  { id: 'c12', name: 'Relay SPDT', type: 'switch', icon: PowerOff, color: '#e11d48' }
];

export default function HardwareSandboxPanel() {
  const [canvasItems, setCanvasItems] = useState([]);
  const [wires, setWires] = useState([]);
  const [drawingWire, setDrawingWire] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const { globalMemory } = useBackplane();
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const galleryRef = useRef(null);
  const scrollAnimRef = useRef(null);

  useEffect(() => {
    if (!autoScroll) {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
      return;
    }

    const scroll = () => {
      if (galleryRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = galleryRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          galleryRef.current.scrollLeft = 0;
        } else {
          galleryRef.current.scrollLeft += 1;
        }
      }
      scrollAnimRef.current = requestAnimationFrame(scroll);
    };
    
    scrollAnimRef.current = requestAnimationFrame(scroll);
    
    return () => {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, [autoScroll]);

  // Drag Engine State
  const [dragging, setDragging] = useState(null); 
  // format: { source: 'lib'|'canvas', id: string, config: object, px: number, py: number, offsetX: number, offsetY: number }

  const { isConnected, lastMessage, connect, disconnect, writeCommand } = useWebSerial(9600);

  useEffect(() => {
    if (!isSimulating || !isConnected) return;
    const interval = setInterval(() => {
        const payload = {
            cmd: "SYNC",
            topology: {
              devices: canvasItems.map(item => ({
                  id: item.instanceId,
                  type: item.type,
                  state: item.type === 'output' ? (globalMemory['Output_1'] ? 1 : 0) : (globalMemory['Input_1'] ? 1 : 0)
              })),
              wires: wires.map(w => ({
                  source: w.from,
                  target: w.to
              }))
            }
        };
        writeCommand(payload);
    }, 500);
    return () => clearInterval(interval);
  }, [isSimulating, isConnected, canvasItems, wires, writeCommand, globalMemory]);

  // Handle Templates (Fixed [object Object])
  const activateTemplate = (procName) => {
    setActiveTemplate(procName);
    setCanvasItems([]); 
    setWires([]);
    setTimeout(() => {
      setCanvasItems([
        { ...COMPONENT_LIBRARY[2], instanceId: 't1', x: 100, y: 150 }, // PLC
        { ...COMPONENT_LIBRARY[7], instanceId: 't2', x: 400, y: 100 }, // DC Motor
        { ...COMPONENT_LIBRARY[8], instanceId: 't3', x: 400, y: 250 }, // Sensor
        { ...COMPONENT_LIBRARY[10], instanceId: 't4', x: 50, y: 300 }  // Battery
      ]);
      // Static hardcoded wires
      setWires([
        { id: 'w1', from: 't4', to: 't1', color: '#ef4444' }, // Battery -> PLC Power
        { id: 'w2', from: 't1', to: 't2', color: '#10b981' }, // PLC -> Motor DO
        { id: 'w3', from: 't1', to: 't3', color: '#3b82f6' }, // PLC -> Sensor DI
        { id: 'w4', from: 't4', to: 't3', color: '#0f172a' }  // Secondary static wire path (just to show multiple)
      ]);
    }, 100);
  };

  const templates = [
    { title: 'Blink an LED with Digital Output', type: 'basic', icon: <Lightbulb size={24} /> },
    { title: 'Using a Micro:bit With a Breadboard', type: 'basic', icon: <Activity size={24} /> },
    ...processes.map(p => ({ title: `Auto OS: ${p.name}`, type: 'process', icon: <Factory size={24} />, procId: p.name }))
  ];

  // Global Pointer Events to allow dragging across the entire screen component bounds
  const handlePointerMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (drawingWire && canvasRef.current) {
      const cRect = canvasRef.current.getBoundingClientRect();
      const lx = e.clientX - cRect.left;
      const ly = e.clientY - cRect.top;
      setDrawingWire(d => ({ ...d, curX: lx, curY: ly }));
    }

    if (!dragging) return;

    if (dragging.source === 'lib') {
      // Just update the ghost layer
      setDragging(d => ({ ...d, px: mx, py: my }));
    } else if (dragging.source === 'canvas') {
      // Direct update of the canvas item for buttery 60fps local drag without ghosting
      if (!canvasRef.current) return;
      const cRect = canvasRef.current.getBoundingClientRect();
      const lx = e.clientX - cRect.left - dragging.offsetX;
      const ly = e.clientY - cRect.top - dragging.offsetY;
      
      setCanvasItems(items => items.map(it => 
        it.instanceId === dragging.id ? { ...it, x: lx, y: ly } : it
      ));
    }
  };

  const handlePointerUp = (e) => {
    if (drawingWire) {
      setDrawingWire(null);
    }
    
    if (!dragging) return;
    
    // If dropping a NEW item from the library
    if (dragging.source === 'lib' && canvasRef.current) {
      const cRect = canvasRef.current.getBoundingClientRect();
      // Check if dropped inside canvas
      if (e.clientX >= cRect.left && e.clientX <= cRect.right &&
          e.clientY >= cRect.top && e.clientY <= cRect.bottom) {
          
          const dropX = e.clientX - cRect.left - dragging.offsetX;
          const dropY = e.clientY - cRect.top - dragging.offsetY;

          setCanvasItems(prev => [...prev, {
            ...dragging.config,
            instanceId: `inst_${Date.now()}`,
            x: dropX,
            y: dropY
          }]);
      }
    }
    
    setDragging(null);
  };

  return (
    <div 
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 650, background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', position: 'relative', touchAction: 'none' }}
    >
      
      {/* 1. TOP GALLERY */}
      <div style={{ height: 160, borderBottom: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', background: 'var(--inp)', flexShrink: 0 }}>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', margin: 0 }}>Recommended Circuits & Process Twins</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button 
              onClick={() => setAutoScroll(!autoScroll)}
              style={{ padding: '0 8px', height: 24, borderRadius: 12, background: autoScroll ? 'var(--ac)' : 'transparent', border: '1px solid var(--bd)', color: autoScroll ? '#000' : 'var(--tx)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, transition: 'all 0.2s' }}
            >
              {autoScroll ? '■ Pause' : '▶ Auto'}
            </button>
            <button 
              onClick={() => galleryRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sf)', border: '1px solid var(--bd)', color: 'var(--tx)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              {'<'}
            </button>
            <button 
              onClick={() => galleryRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sf)', border: '1px solid var(--bd)', color: 'var(--tx)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              {'>'}
            </button>
          </div>
        </div>
        
        <div ref={galleryRef} style={{ flex: 1, padding: '0 16px 12px', display: 'flex', gap: 12, overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {templates.map((tpl, i) => (
            <div key={i} onClick={() => activateTemplate(tpl.procId || tpl.title)} style={{ 
              display: 'inline-flex', flexDirection: 'column', width: 200, height: '100%', background: 'var(--sfh)', 
              borderRadius: 8, border: activeTemplate === (tpl.procId || tpl.title) ? '2px solid var(--ac)' : '1px solid var(--bd)',
              overflow: 'hidden', cursor: 'pointer', flexShrink: 0, transition: 'border 0.2s'
            }}>
              <div style={{ height: 60, background: tpl.type === 'process' ? '#112233' : '#2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tpl.type === 'process' ? 'var(--ac)' : '#fff' }}>
                {tpl.icon}
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)', whiteSpace: 'normal', lineHeight: 1.2 }}>{tpl.title}</span>
                <button style={{ width: 'fit-content', background: 'transparent', border: '1px solid var(--inf)', color: 'var(--inf)', borderRadius: 12, padding: '2px 10px', fontSize: 10, marginTop: 'auto', cursor: 'pointer' }}>
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* 2. MAIN CANVAS */}
        <div 
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--bg)', backgroundImage: `radial-gradient(var(--bdh) 1px, transparent 1px)`, backgroundSize: '15px 15px' }}
        >
          {/* Overlay controls */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
            <button style={{ border: 'none', background: '#fff', borderRadius: 4, width: 32, height: 32, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', color: '#000' }}>↺</button>
            <button style={{ border: 'none', background: '#fff', borderRadius: 4, width: 32, height: 32, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', color: '#000' }}>↻</button>
            <button onClick={() => setCanvasItems([])} style={{ border: 'none', background: '#fff', borderRadius: 4, width: 32, height: 32, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer', color: 'red' }}>🗑</button>
          </div>

          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
            <button 
              onClick={isConnected ? disconnect : connect}
              style={{ border: `1px solid ${isConnected ? 'var(--bd)' : 'var(--inf)'}`, background: isConnected ? 'var(--dn)' : '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: isConnected ? '#000' : 'var(--inf)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {isConnected ? 'USB Connected' : 'Connect COM Port'}
            </button>
            <button style={{ border: '1px solid var(--bd)', background: '#fff', color: '#000', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>&lt;/&gt; Code</button>
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              style={{ border: 'none', background: isSimulating ? '#ef4444' : '#10b981', color: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'background 0.2s' }}>
              {isSimulating ? '■ Stop Simulation' : '▶ Start Simulation'}
            </button>
          </div>
          
          {/* Serial Monitor Overlay */}
          {isConnected && (
             <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, background: 'rgba(0,0,0,0.85)', color: '#10b981', padding: 10, fontSize: 11, fontFamily: 'monospace', borderRadius: 6, maxHeight: 120, overflowY: 'auto' }}>
                <div style={{ color: '#9ca3af', marginBottom: 6, fontWeight: 600 }}>[COM PORT OPEN] - Bi-Directional Stream:</div>
                <div>{lastMessage ? JSON.stringify(lastMessage) : 'Listening for telemetry payload...'}</div>
             </div>
          )}

          {/* Static Wiring Layer */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            {wires.map(w => {
              const fromItem = canvasItems.find(i => i.instanceId === w.from);
              const toItem = canvasItems.find(i => i.instanceId === w.to);
              if (!fromItem || !toItem) return null;
              
              const x1 = fromItem.x + 84;
              const y1 = fromItem.y + 42;
              const x2 = toItem.x;
              const y2 = toItem.y + 42;
              
              const cp1x = x1 + Math.abs(x2 - x1) / 2;
              const cp1y = y1;
              const cp2x = x2 - Math.abs(x2 - x1) / 2;
              const cp2y = y2;
              
              return (
                <path 
                  key={w.id}
                  d={`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`}
                  fill="none"
                  stroke={w.color || "#475569"}
                  strokeWidth="3.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWires(ws => ws.filter(x => x.id !== w.id));
                  }}
                  style={{ transition: 'd 0.15s ease-out', pointerEvents: 'visibleStroke', cursor: 'pointer' }}
                />
              );
            })}
            
            {drawingWire && (
               <path 
                 d={`M ${drawingWire.x1} ${drawingWire.y1} C ${drawingWire.x1 + Math.abs(drawingWire.curX - drawingWire.x1)/2} ${drawingWire.y1}, ${drawingWire.curX - Math.abs(drawingWire.curX - drawingWire.x1)/2} ${drawingWire.curY}, ${drawingWire.curX} ${drawingWire.curY}`}
                 fill="none"
                 stroke="#94a3b8"
                 strokeWidth="4"
                 strokeDasharray="5 5"
               />
            )}
          </svg>

          {/* Render Items */}
          {canvasItems.map((item) => {
            const IconComp = item.icon;
            
            return (
              <div 
                key={item.instanceId} 
                onPointerDown={(e) => {
                  e.stopPropagation();
                  // Initiate local Canvas drag
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragging({
                    source: 'canvas',
                    id: item.instanceId,
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top
                  });
                }}
                style={{
                  position: 'absolute', left: item.x, top: item.y,
                  width: 84, height: 84, background: 'var(--inp)', borderRadius: 8, backdropFilter: 'blur(12px)',
                  boxShadow: (dragging?.id === item.instanceId) ? 'var(--sh)' : '0 4px 10px rgba(0,0,0,0.2)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--bd)', cursor: dragging ? 'grabbing' : 'grab',
                  zIndex: (dragging?.id === item.instanceId) ? 100 : 10,
                  transform: (dragging?.id === item.instanceId) ? 'scale(1.05)' : 'scale(1)',
                  transition: 'box-shadow 0.15s, transform 0.15s, border-color 0.15s'
                }}
              >
                <div style={{ color: item.color, marginBottom: 6 }}><IconComp size={32} strokeWidth={1.5} /></div>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--tx)', textAlign: 'center', px: 4, lineHeight: 1.1 }}>{item.name}</div>
                
                {/* Wiring Nodes */}
                <div 
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDrawingWire({ from: item.instanceId, port: 'left', x1: item.x, y1: item.y + 42, curX: item.x, curY: item.y + 42 });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (drawingWire && drawingWire.from !== item.instanceId) {
                       const c = ['#ef4444', '#10b981', '#3b82f6', '#d97706', '#8b5cf6'][Math.floor(Math.random() * 5)];
                       setWires(prev => [...prev, { id: Date.now().toString(), from: drawingWire.from, to: item.instanceId, color: c }]);
                    }
                    setDrawingWire(null);
                  }}
                  style={{ width: 14, height: 14, borderRadius: '50%', background: '#ef4444', position: 'absolute', top: '50%', left: -7, marginTop: -7, cursor: 'crosshair', zIndex: 10, border: '2px solid #fff' }}
                ></div>
                <div 
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDrawingWire({ from: item.instanceId, port: 'right', x1: item.x + 84, y1: item.y + 42, curX: item.x + 84, curY: item.y + 42 });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    if (drawingWire && drawingWire.from !== item.instanceId) {
                       const c = ['#ef4444', '#10b981', '#3b82f6', '#d97706', '#8b5cf6'][Math.floor(Math.random() * 5)];
                       setWires(prev => [...prev, { id: Date.now().toString(), from: drawingWire.from, to: item.instanceId, color: c }]);
                    }
                    setDrawingWire(null);
                  }}
                  style={{ width: 14, height: 14, borderRadius: '50%', background: '#0f172a', position: 'absolute', top: '50%', right: -7, marginTop: -7, cursor: 'crosshair', zIndex: 10, border: '2px solid #fff' }}
                ></div>
              </div>
            );
          })}

          {canvasItems.length === 0 && (
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', fontWeight: 600, fontSize: 16 }}>
               Drag & Drop components or select a Top-20 template.
             </div>
          )}
        </div>

        {/* 3. HARDWARE TOOLBOX */}
        <div style={{ width: 280, background: 'var(--bg)', borderLeft: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
          
          <div style={{ padding: 12, borderBottom: '1px solid var(--bd)', background: 'var(--sf)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>Components</div>
            <select style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bd)', fontSize: 11, background: 'var(--inp)', color: 'var(--tx)', outline: 'none' }}>
              <option>Basic</option>
              <option>All</option>
              <option>PLC Standard</option>
            </select>
            <input 
              placeholder="Search..." 
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--bd)', marginTop: 8, fontSize: 11, background: 'var(--inp)', color: 'var(--tx)', outline: 'none' }} 
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 10, alignContent: 'start' }}>
            {COMPONENT_LIBRARY.map(comp => {
              const IconComp = comp.icon;
              return (
                <div 
                  key={comp.id} 
                  onPointerDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragging({
                      source: 'lib',
                      config: comp,
                      px: e.clientX - containerRef.current.getBoundingClientRect().left,
                      py: e.clientY - containerRef.current.getBoundingClientRect().top,
                      offsetX: e.clientX - rect.left,
                      offsetY: e.clientY - rect.top
                    });
                  }}
                  style={{ 
                    aspectRatio: '1/1', background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 8,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'grab', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ac)';
                    e.currentTarget.style.boxShadow = 'var(--acs)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--bd)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ color: comp.color, marginBottom: 8 }}><IconComp size={28} strokeWidth={1.5} /></div>
                  <div style={{ fontSize: 9, color: 'var(--tx)', fontWeight: 600, textAlign: 'center', padding: '0 4px', lineHeight: 1.2 }}>{comp.name}</div>
                </div>
              );
            })}
          </div>
          
        </div>
        
        {/* Render Ghost Drag Item over the entire container when dragging from Library */}
        {dragging?.source === 'lib' && (
           <div style={{
            position: 'absolute',
            pointerEvents: 'none', // ensures mouse events pass through to container drop zone
            left: dragging.px - dragging.offsetX,
            top: dragging.py - dragging.offsetY,
            width: 84, height: 84, background: '#ffffffcc', backdropFilter: 'blur(4px)', borderRadius: 8,
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #10b981', zIndex: 1000
          }}>
            <div style={{ color: dragging.config.color, marginBottom: 6 }}>
              {React.createElement(dragging.config.icon, { size: 32, strokeWidth: 1.5 })}
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#334155', textAlign: 'center', px: 4, lineHeight: 1.1 }}>{dragging.config.name}</div>
          </div>
        )}

      </div>
    </div>
  );
}
