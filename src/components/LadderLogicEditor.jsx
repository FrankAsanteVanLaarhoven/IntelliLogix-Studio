import React, { useState, useEffect, useCallback } from 'react';
import { LadderEngine } from '../engine/LadderEngine';
import { useBackplane } from '../context/BackplaneContext';

export default function LadderLogicEditor() {
  const [engine] = useState(new LadderEngine());
  const { globalMemory: memory, setGlobalMemory: setMemory, tagDefinitions, setTagDefinitions } = useBackplane();
  const [rungs, setRungs] = useState([
    {
      id: 'R_Permissives',
      elements: [
        { id: 'e1', type: 'NO', tag: 'Estop_OK' },
        { id: 'e2', type: 'NO', tag: 'Doors_Closed' },
        { id: 'e3', type: 'NC', tag: 'System_Faulted' },
        { id: 'e4', type: 'COIL', tag: 'System_Ready' }
      ]
    },
    {
      id: 'R_MotorStart',
      elements: [
        {
          id: 'b1',
          type: 'BRANCH',
          paths: [
            [{ id: 'e5', type: 'NO', tag: 'Start_Button' }],
            [{ id: 'e6', type: 'NO', tag: 'Motor_Cmd' }]
          ]
        },
        { id: 'e7', type: 'NO', tag: 'System_Ready' },
        { id: 'e8', type: 'COIL', tag: 'Motor_Cmd' }
      ]
    },
    {
      id: 'R_FaultTimer',
      elements: [
        { id: 'e9', type: 'NO', tag: 'Motor_Cmd' },
        { id: 'e10', type: 'NC', tag: 'Motor_Aux' },
        { id: 'e11', type: 'TON', tag: 'Fault_Timer' }
      ]
    },
    {
      id: 'R_FaultLatch',
      elements: [
        { id: 'e12', type: 'NO', tag: 'Fault_Timer_DN' },
        { id: 'e13', type: 'OTL', tag: 'System_Faulted' }
      ]
    }
  ]);
  const [powerFlows, setPowerFlows] = useState([]);
  
  const [selectedRung, setSelectedRung] = useState('R1');
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagType, setNewTagType] = useState('Boolean');
  
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dragHoverTarget, setDragHoverTarget] = useState(null);
  
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [activeTab, setActiveTab] = useState('Contacts');
  const [activeLesson, setActiveLesson] = useState('Lesson 0');

  const startResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const handleMove = (ev) => setSidebarWidth(Math.max(160, Math.min(startW + (ev.clientX - startX), 500)));
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const simulateTick = useCallback(() => {
    engine.load({ memory, rungs });
    const res = engine.evaluate();
    if (JSON.stringify(memory) !== JSON.stringify(res.memory)) {
      setMemory(res.memory);
    }
    setPowerFlows(res.powerFlows);
  }, [engine, memory, rungs, setMemory]);

  useEffect(() => {
    const interval = setInterval(simulateTick, 100);
    return () => clearInterval(interval);
  }, [simulateTick]);

  const toggleTag = (tag) => {
    setMemory(prev => ({ ...prev, [tag]: !prev[tag] }));
  };

  const addTag = () => {
    if (newTagInput && memory[newTagInput] === undefined) {
      setMemory(prev => ({ ...prev, [newTagInput]: newTagType === 'Boolean' ? false : 0 }));
      if (setTagDefinitions) {
         setTagDefinitions(prev => ({ ...prev, [newTagInput]: newTagType }));
      }
      setNewTagInput('');
    }
  };

  const removeTag = (tag) => {
    setMemory(prev => { const n = {...prev}; delete n[tag]; return n; });
    if (setTagDefinitions) {
      setTagDefinitions(prev => { const n = {...prev}; delete n[tag]; return n; });
    }
  };

  // AST Recursive Utilities
  const processAST = (elements, actionFn) => {
    let newElements = actionFn([...elements]);
    return newElements.map(el => {
      if (el.type === 'BRANCH') {
         return { ...el, paths: el.paths.map(path => processAST(path, actionFn)) };
      }
      return el;
    });
  };

  const addElement = (type, targetId = null) => {
    const targetTags = Object.keys(memory);
    if (targetTags.length === 0) return;
    
    // Create new element block
    const newEl = { id: `e${Date.now()}`, type, tag: targetTags[0] };
    if (type === 'BRANCH') {
       newEl.paths = [ [], [] ]; // start with two empty OR paths
    }

    setRungs(prev => prev.map(r => {
      // Find insertion target (rung root or inside a branch path)
      if (r.id === targetId || (targetId === null && r.id === selectedRung)) {
        return { 
          ...r, 
          elements: [
            ...r.elements.filter(e => !['COIL', 'OTL', 'OTU'].includes(e.type)),
            newEl,
            ...r.elements.filter(e => ['COIL', 'OTL', 'OTU'].includes(e.type))
          ] 
        };
      }
      
      // If dropping into a specific nested path AST:
      if (targetId && targetId.startsWith('path_')) {
         return {
           ...r,
           elements: processAST(r.elements, (arr) => {
              if (arr.__pathId === targetId) {
                return [...arr.filter(e => !['COIL', 'OTL', 'OTU'].includes(e.type)), newEl, ...arr.filter(e => ['COIL', 'OTL', 'OTU'].includes(e.type))];
              }
              return arr;
           })
         };
      }
      return r;
    }));
  };

  const updateElementTag = (rungId, elementId, newTag, field = 'tag') => {
    setRungs(prev => prev.map(r => r.id !== rungId ? r : {
      ...r,
      elements: processAST(r.elements, (arr) => arr.map(e => e.id === elementId ? { ...e, [field]: newTag } : e))
    }));
  };

  const removeElement = (rungId, elementId) => {
    setRungs(prev => prev.map(r => r.id !== rungId ? r : {
      ...r,
      elements: processAST(r.elements, (arr) => arr.filter(e => e.id !== elementId))
    }));
  };

  const removeRung = (rungId) => setRungs(prev => prev.filter(r => r.id !== rungId));
  const addRung = () => setRungs(prev => [...prev, { id: `R${Date.now()}`, elements: [] }]);

  const saveTopology = () => {
    localStorage.setItem('plc_fiddle_rungs', JSON.stringify(rungs));
    localStorage.setItem('plc_fiddle_memory', JSON.stringify(memory));
    if (tagDefinitions) localStorage.setItem('plc_fiddle_tags', JSON.stringify(tagDefinitions));
    alert('Topology Saved Internally.');
  };

  const loadTopology = () => {
    const r = localStorage.getItem('plc_fiddle_rungs');
    const m = localStorage.getItem('plc_fiddle_memory');
    const t = localStorage.getItem('plc_fiddle_tags');
    if (r && m) {
      setRungs(JSON.parse(r));
      setMemory(JSON.parse(m));
      if (t && setTagDefinitions) setTagDefinitions(JSON.parse(t));
    }
  };

  const renderToolButton = (type, label) => (
    <button draggable onDragStart={e => e.dataTransfer.setData('type', type)} onClick={() => addElement(type, selectedRung)} style={{ background: 'var(--sf)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '0 12px', borderRadius: 4, cursor: 'grab', fontFamily: 'monospace', fontSize: 12, display: 'flex', alignItems: 'center', height: 28 }}>{label}</button>
  );

  const VarSel = ({ val, onChange }) => (
     <select 
       value={val || ''} 
       onChange={e => onChange(e.target.value)}
       onClick={e => e.stopPropagation()}
       style={{ background: 'var(--inp)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: 2, fontSize: 9, fontFamily: 'monospace', maxWidth: 80, padding: 1 }}
     >
       <option value="" disabled>Select</option>
       {Object.keys(memory).map(t => <option key={t} value={t}>{t}</option>)}
     </select>
  );

  // AST Recursive UI rendering mechanism for Elements
  const renderElementsAST = (elements, pathFlowData, rungId, inBranch = false) => {
    return elements.map((el, eIdx) => {
      // Look up power flow metadata returned from LadderEngine
      const md = pathFlowData ? pathFlowData[eIdx] : null;
      
      const powerReachesIncoming = md ? (eIdx === 0 ? true : pathFlowData[eIdx - 1]?.nodePower) : false; // rough approx for lines
      const componentPassesPower = md ? md.nodePower : false;
      
      const connectGlow = powerReachesIncoming ? 'var(--ac)' : 'var(--bd)';
      const itemGlow = componentPassesPower ? 'var(--ac)' : 'var(--t3)';
      const glowShadow = componentPassesPower ? 'drop-shadow(0 0 4px var(--ac))' : 'none';

      if (el.type === 'BRANCH') {
         // Render recursive parallel OR tracks vertically stacked
         return (
           <div key={el.id} style={{ display: 'flex', alignItems: 'center', position: 'relative', margin: '0 10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
               
               {/* Vertical Connection Lines linking branches */}
               <div style={{ position: 'absolute', top: 30, bottom: 30, left: 0, width: 2, background: connectGlow }}></div>
               <div style={{ position: 'absolute', top: 30, bottom: 30, right: 0, width: 2, background: itemGlow }}></div>

               {el.paths.map((pathEls, pIdx) => {
                 const branchPathId = `path_${el.id}_${pIdx}`;
                 pathEls.__pathId = branchPathId; // tag for dropping mechanism
                 const isHoverPath = dragHoverTarget === branchPathId;
                 
                 return (
                   <div 
                     key={pIdx} 
                     onDragOver={e => { e.preventDefault(); setDragHoverTarget(branchPathId); }}
                     onDragLeave={() => setDragHoverTarget(null)}
                     onDrop={e => { e.preventDefault(); setDragHoverTarget(null); const t = e.dataTransfer.getData('type'); if (t) addElement(t, branchPathId); }}
                     style={{ 
                       display: 'flex', alignItems: 'center', minHeight: 60, minWidth: 100, padding: '0 20px', position: 'relative',
                       background: isHoverPath ? 'var(--sfh)' : 'transparent',
                       border: isHoverPath ? '1px dashed var(--ac)' : '1px solid transparent',
                       borderRadius: 4
                     }}
                   >
                     {/* Horizontal inline wire if path empty */}
                     <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: md?.paths?.[pIdx]?.powerOut ? 'var(--ac)' : 'var(--bd)' }}></div>
                     <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', width: '100%' }}>
                       {renderElementsAST(pathEls, md?.paths?.[pIdx]?.elementFlows, rungId, true)}
                     </div>
                   </div>
                 )
               })}
             </div>
             
             {/* Delete branch overlay */}
             <div style={{ position: 'absolute', top: -10, display: 'flex', gap: 4, right: '50%', zIndex: 20 }}>
                <button onClick={(e) => { e.stopPropagation(); removeElement(rungId, el.id); }} style={{ background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--dn)', cursor: 'pointer', fontSize: 9, borderRadius: 2 }}>✕ B</button>
             </div>
             {/* End of branch stub */}
             <div style={{ width: 30, height: 2, background: itemGlow }}></div>
           </div>
         );
      }

      // Base component UI (same as before)
      return (
        <div key={el.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div style={{ width: 30, height: 2, background: connectGlow }}></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', filter: glowShadow, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -20, display: 'flex', gap: 4, right: 0, zIndex: 20 }}>
              <button onClick={(e) => { e.stopPropagation(); removeElement(rungId, el.id); }} style={{ background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--dn)', cursor: 'pointer', fontSize: 9, borderRadius: 2 }}>✕</button>
            </div>
            
            <div style={{ padding: '0 4px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {['NO', 'NC', 'COIL', 'OTL', 'OTU', 'ONS'].includes(el.type) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <VarSel val={el.tag} onChange={v => updateElementTag(rungId, el.id, v)} />
                  <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 18, color: itemGlow, fontWeight: 700 }}>
                    {el.type === 'NO' && '-| |-'}
                    {el.type === 'NC' && '-|/|-'}
                    {el.type === 'ONS' && '-[ONS]-'}
                    {el.type === 'COIL' && '-( )-'}
                    {el.type === 'OTL' && '-(L)-'}
                    {el.type === 'OTU' && '-(U)-'}
                  </div>
                </div>
              )}
              {['TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES'].includes(el.type) && (
                <div style={{ border: `1px solid ${itemGlow}`, borderRadius: 4, background: 'var(--sf)', padding: 6, width: 80, fontSize: 9, fontFamily: 'monospace', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                   <div style={{ borderBottom: `1px solid ${itemGlow}`, paddingBottom: 2, marginBottom: 2, textAlign: 'center', fontWeight: 700, color: itemGlow }}>{el.type}</div>
                   <VarSel val={el.tag} onChange={v => updateElementTag(rungId, el.id, v)} />
                   {['TON', 'TOF', 'RTO'].includes(el.type) ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>EN</span> <span style={{ color: memory[`${el.tag}_EN`] ? 'var(--ac)' : 'var(--t3)' }}>{memory[`${el.tag}_EN`] ? '1' : '0'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DN</span> <span style={{ color: memory[`${el.tag}_DN`] ? 'var(--ac)' : 'var(--t3)' }}>{memory[`${el.tag}_DN`] ? '1' : '0'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ACC</span> <span>{memory[`${el.tag}_ACC`] || 0}</span></div>
                      </>
                   ) : el.type !== 'RES' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>CU</span> <span style={{ color: memory[`${el.tag}_CU`] ? 'var(--ac)' : 'var(--t3)' }}>{memory[`${el.tag}_CU`] ? '1' : '0'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DN</span> <span style={{ color: memory[`${el.tag}_DN`] ? 'var(--ac)' : 'var(--t3)' }}>{memory[`${el.tag}_DN`] ? '1' : '0'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ACC</span> <span>{memory[`${el.tag}_ACC`] || 0}</span></div>
                      </>
                   ) : <div style={{ fontSize: 8, color: 'var(--t3)', textAlign: 'center' }}>Reset Tag</div>}
                </div>
              )}
              {['ADD', 'SUB', 'MUL', 'DIV'].includes(el.type) && (
                <div style={{ border: `1px solid ${itemGlow}`, borderRadius: 4, background: 'var(--sf)', padding: 6, width: 80, fontSize: 9, fontFamily: 'monospace', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                   <div style={{ borderBottom: `1px solid ${itemGlow}`, paddingBottom: 2, marginBottom: 2, textAlign: 'center', fontWeight: 700, color: itemGlow }}>{el.type}</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>A</span> <VarSel val={el.tagA} onChange={v => updateElementTag(rungId, el.id, v, 'tagA')} /></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>B</span> <VarSel val={el.tagB} onChange={v => updateElementTag(rungId, el.id, v, 'tagB')} /></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DEST</span> <VarSel val={el.tagDest} onChange={v => updateElementTag(rungId, el.id, v, 'tagDest')} /></div>
                </div>
              )}
              {['MOV'].includes(el.type) && (
                <div style={{ border: `1px solid ${itemGlow}`, borderRadius: 4, background: 'var(--sf)', padding: 6, width: 80, fontSize: 9, fontFamily: 'monospace', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                   <div style={{ borderBottom: `1px solid ${itemGlow}`, paddingBottom: 2, marginBottom: 2, textAlign: 'center', fontWeight: 700, color: itemGlow }}>{el.type}</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>SRC</span> <VarSel val={el.tagA} onChange={v => updateElementTag(rungId, el.id, v, 'tagA')} /></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DEST</span> <VarSel val={el.tagDest} onChange={v => updateElementTag(rungId, el.id, v, 'tagDest')} /></div>
                </div>
              )}
              {['EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ'].includes(el.type) && (
                <div style={{ border: `1px solid ${itemGlow}`, borderRadius: 4, background: 'var(--sf)', padding: 6, width: 80, fontSize: 9, fontFamily: 'monospace', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                   <div style={{ borderBottom: `1px solid ${itemGlow}`, paddingBottom: 2, marginBottom: 2, textAlign: 'center', fontWeight: 700, color: itemGlow }}>{el.type}</div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>A</span> <VarSel val={el.tagA} onChange={v => updateElementTag(rungId, el.id, v, 'tagA')} /></div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>B</span> <VarSel val={el.tagB} onChange={v => updateElementTag(rungId, el.id, v, 'tagB')} /></div>
                </div>
              )}
            </div>
          </div>
          
          {/* Trail out line */}
          {eIdx === elements.length - 1 && !inBranch && (
            <div style={{ flex: 1, minWidth: 40, height: 2, background: itemGlow, transition: 'background 0.2s', boxShadow: componentPassesPower ? '0 0 6px var(--ac)' : 'none' }}></div>
          )}
        </div>
      )
    });
  };

  return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 600 }}>
      {/* Top Header & Mode Switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid var(--bd)', background: 'var(--sfh)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', letterSpacing: 1 }}>IntelliLogix Studio</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={saveTopology} style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--t2)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>💾 Save</button>
            <button onClick={loadTopology} style={{ background: 'var(--inp)', border: '1px solid var(--bd)', color: 'var(--t2)', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>📂 Load</button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 20, padding: 4 }}>
          <button onClick={() => setIsExpertMode(false)} style={{ border: 'none', background: !isExpertMode ? 'var(--ac)' : 'transparent', color: !isExpertMode ? '#000' : 'var(--tx)', padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Training Matrix</button>
          <button onClick={() => setIsExpertMode(true)} style={{ border: 'none', background: isExpertMode ? 'var(--ac)' : 'transparent', color: isExpertMode ? '#000' : 'var(--tx)', padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Expert Mode</button>
        </div>
      </div>

      {/* Conditional Curriculum Layout */}
      {!isExpertMode && (
        <div style={{ display: 'flex', height: 140, borderBottom: '1px solid var(--bd)', background: 'var(--bg)' }}>
          <div style={{ width: 220, borderRight: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', background: 'var(--sf)' }}>
            <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--t2)', borderBottom: '1px solid var(--bd)' }}>Boolean Logic Basics</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
               {['Introduction', 'Lesson 0', 'Lesson 1', 'Lesson 2', 'Lesson 3'].map(l => (
                 <div key={l} onClick={() => setActiveLesson(l)} style={{ padding: '6px 12px', fontSize: 12, color: activeLesson === l ? 'var(--ac)' : 'var(--tx)', background: activeLesson === l ? 'var(--sfh)' : 'transparent', cursor: 'pointer', borderLeft: activeLesson === l ? '3px solid var(--ac)' : '3px solid transparent' }}>{l}</div>
               ))}
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', fontSize: 13, lineHeight: 1.6, color: 'var(--t2)', background: 'var(--sfh)' }}>
            <p style={{ color: 'var(--tx)', fontWeight: 600, marginBottom: 8 }}>{activeLesson}</p>
            {activeLesson === 'Lesson 0' && <p>Thanks for accessing the SOTA Code School. Let's familiarize yourself with the Fiddle workspace. On the left is the Tag Memory List. Click the 'FALSE' indicator to switch logic states manually.</p>}
            {activeLesson !== 'Lesson 0' && <p>Select elements from the categorical toolbox tabs below and drag them onto the Rung architecture to evaluate structural node constraints. To use branching logic or mathematical functions, toggle into Expert Mode.</p>}
          </div>
        </div>
      )}

      {/* Categorical Toolbox Header */}
      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--bd)', background: 'var(--inp)' }}>
        <div style={{ display: 'flex', gap: 2, padding: '0 16px', background: 'var(--sf)', borderBottom: '1px solid var(--bd)' }}>
          {['Contacts', 'Coils', 'Math', 'Compare', 'Time/Count', 'Other'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? 'var(--bg)' : 'transparent', border: 'none', color: activeTab === tab ? 'var(--ac)' : 'var(--t2)', padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderTop: activeTab === tab ? '2px solid var(--ac)' : '2px solid transparent' }}>{tab}</button>
          ))}
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', gap: 8, height: 28 }}>
             {activeTab === 'Contacts' && (
               <>
                 {renderToolButton('NO', '-| |- Normally Open')}
                 {renderToolButton('NC', '-|/|- Normally Closed')}
                 {isExpertMode && renderToolButton('ONS', '-[ONS]- One Shot')}
               </>
             )}
             {activeTab === 'Coils' && (
               <>
                 {renderToolButton('COIL', '-( )- Base Coil')}
                 {renderToolButton('OTL', '-(L)- Latch')}
                 {renderToolButton('OTU', '-(U)- Unlatch')}
               </>
             )}
             {activeTab === 'Time/Count' && (
               <>
                 {renderToolButton('TON', '[ TON ] On Delay')}
                 {renderToolButton('TOF', '[ TOF ] Off Delay')}
                 {renderToolButton('RTO', '[ RTO ] Retentive Timer')}
                 {renderToolButton('CTU', '[ CTU ] Count Up')}
                 {renderToolButton('CTD', '[ CTD ] Count Down')}
                 {renderToolButton('RES', '[ RES ] Reset')}
               </>
             )}
             {!isExpertMode && ['Math', 'Compare', 'Other'].includes(activeTab) && (
                <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', padding: '0 8px' }}>Select 'Expert Mode' (top right) to unlock advanced {activeTab} instructions.</div>
             )}
             {isExpertMode && activeTab === 'Math' && (
                <>
                  {renderToolButton('ADD', '[ ADD ] Addition')}
                  {renderToolButton('SUB', '[ SUB ] Subtract')}
                  {renderToolButton('MUL', '[ MUL ] Multiply')}
                  {renderToolButton('DIV', '[ DIV ] Divide')}
                  {renderToolButton('MOV', '[ MOV ] Assign/Move')}
                </>
             )}
             {isExpertMode && activeTab === 'Compare' && (
                <>
                  {renderToolButton('EQU', '[ EQU ] Equal')}
                  {renderToolButton('NEQ', '[ NEQ ] Not Eq')}
                  {renderToolButton('GRT', '[ GRT ] Greater')}
                  {renderToolButton('GEQ', '[ GEQ ] Grt/Eq')}
                  {renderToolButton('LES', '[ LES ] Less')}
                  {renderToolButton('LEQ', '[ LEQ ] Les/Eq')}
                </>
             )}
             {isExpertMode && activeTab === 'Other' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {renderToolButton('BRANCH', '[ --/-- ] OR Branch')}
                  <button onClick={saveTopology} style={{ background: '#4285f4', border: '1px solid #3367d6', color: '#fff', padding: '0 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, height: 28, display: 'flex', alignItems: 'center' }}>✎ Save</button>
                  <button onClick={addRung} style={{ background: '#4285f4', border: '1px solid #3367d6', color: '#fff', padding: '0 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, height: 28, display: 'flex', alignItems: 'center' }}>Add Rung</button>
                </div>
             )}
          </div>
          <button onClick={addRung} style={{ background: 'var(--ac)', color: '#000', border: 'none', padding: '0 16px', borderRadius: 4, height: 28, cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center' }}>+ Add Rung</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {/* Left Sidebar - Memory / Tags */}
        <div style={{ 
          width: sidebarCollapsed ? 0 : sidebarWidth, 
          padding: sidebarCollapsed ? 0 : 12, 
          display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--sfh)', 
          overflow: 'hidden', transition: 'width 0.2s', borderRight: sidebarCollapsed ? 'none' : '1px solid var(--bd)',
          position: 'relative'
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>Tag Memory List</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: sidebarCollapsed ? 0 : 1 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input 
                placeholder="Tag Name" 
                value={newTagInput} 
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                style={{ flex: 1, padding: '4px 8px', background: 'var(--inp)', border: '1px solid var(--bd)', borderRadius: 4, color: 'var(--tx)', fontSize: 11 }}
              />
              <button onClick={addTag} style={{ background: '#4285f4', border: 'none', color: '#fff', borderRadius: 4, padding: '0 12px', cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>Add</button>
            </div>
            <select 
              value={newTagType} 
              onChange={e => setNewTagType(e.target.value)}
              style={{ width: '100%', padding: '4px 8px', borderRadius: 4, border: '1px solid var(--bd)', background: 'var(--inp)', color: 'var(--tx)', fontSize: 11 }}
            >
               <option value="Boolean">Boolean</option>
               <option value="Number">Number</option>
               <option value="Timer">Timer</option>
               <option value="Counter">Counter</option>
            </select>
          </div>

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {Object.entries(memory).map(([tag, val]) => {
              const type = tagDefinitions ? (tagDefinitions[tag] || 'Boolean') : 'Boolean';
              return (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => removeTag(tag)} style={{ borderRadius: '50%', background: 'transparent', border: '1px solid var(--t3)', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)', fontSize: 9, cursor: 'pointer'}}>x</button>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--tx)', display: 'block', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag}</span>
                  </div>
                  
                  {type === 'Boolean' && (
                    <button 
                      onClick={() => toggleTag(tag)}
                      style={{ 
                        cursor: 'pointer', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px',
                        background: val ? 'var(--ac)' : 'var(--dn)', 
                        color: '#000',
                        transition: 'all 0.2s',
                        boxShadow: val ? '0 0 10px var(--acs)' : 'none'
                      }}
                    >
                      {val ? 'ON' : 'OFF'}
                    </button>
                  )}
                  {type !== 'Boolean' && (
                    <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>[{type}]</span>
                  )}
                </div>
              );
            })}
          </div>

            {!sidebarCollapsed && (
              <div 
                onPointerDown={startResize}
                style={{ position: 'absolute', top: 0, right: -4, width: 8, height: '100%', cursor: 'col-resize', zIndex: 100 }}
              />
            )}
          </div>
          
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ position: 'absolute', left: sidebarCollapsed ? 0 : sidebarWidth, top: 12, zIndex: 110, padding: '4px 6px', background: 'var(--inp)', border: '1px solid var(--bd)', borderLeft: 'none', borderRadius: '0 4px 4px 0', color: 'var(--tx)', cursor: 'pointer', transition: 'left 0.2s', display: 'flex', alignItems: 'center' }}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>

        {/* Main Ladder Canvas */}
        <div style={{ flex: 1, padding: 24, paddingLeft: 40, overflowY: 'auto', background: 'var(--bg)', position: 'relative' }}>
          
          {/* Hot power rail */}
          <div style={{ position: 'absolute', left: 20, top: 0, bottom: 0, width: 4, background: 'var(--ac)', boxShadow: '0 0 8px var(--ac)', zIndex: 10 }}></div>
          {/* Neutral power rail */}
          <div style={{ position: 'absolute', right: 20, top: 0, bottom: 0, width: 4, background: 'var(--t3)', zIndex: 10 }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 40, paddingLeft: 10, paddingRight: 10 }}>
            {rungs.map((rung, rIdx) => {
              const isActive = selectedRung === rung.id;
              const isHoverRoot = dragHoverTarget === rung.id;
              
              // Map output tree flows directly
              const mdPowerFlows = powerFlows.find(pf => pf.rungId === rung.id)?.elements;

              return (
                <div 
                  key={rung.id} 
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragHoverTarget(rung.id); }}
                  onDragLeave={() => setDragHoverTarget(null)}
                  onDrop={(e) => { e.preventDefault(); setDragHoverTarget(null); const t = e.dataTransfer.getData('type'); if (t) addElement(t, rung.id); setSelectedRung(rung.id); }}
                  onClick={() => setSelectedRung(rung.id)}
                  style={{ 
                    position: 'relative', 
                    display: 'flex', 
                    alignItems: 'center', 
                    minHeight: 80,
                    cursor: 'pointer',
                    background: isHoverRoot ? 'var(--bd)' : (isActive ? 'var(--sfh)' : 'transparent'),
                    border: isHoverRoot ? '1px dashed var(--ac)' : (isActive ? '1px dashed var(--t3)' : '1px solid transparent'),
                    borderRadius: 8,
                    transition: 'all 0.2s'
                  }}
                >
                  <button onClick={(e) => { e.stopPropagation(); removeRung(rung.id); }} style={{ position: 'absolute', left: -20, background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', zIndex: 10 }}>X</button>
                  
                  {/* Root inline wire */}
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: 'var(--bd)', transform: 'translateY(-50%)' }}></div>

                  {/* Components mapped recursively */}
                  <div style={{ zIndex: 5, padding: '0 20px', display: 'flex', alignItems: 'center', width: '100%' }}>
                     {renderElementsAST(rung.elements, mdPowerFlows, rung.id, false)}
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
