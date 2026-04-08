import React, { useState, useRef } from 'react';

export default function DraggableWindow({ 
  title, 
  iconColor, 
  children, 
  onClose, 
  bringToFront,
  defaultWidth = 600,
  defaultHeight = 400,
  defaultX = 100,
  defaultY = 100
}) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  
  const dragRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, initialW: 0, initialH: 0 });

  const handlePointerDown = (e) => {
    bringToFront();
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: pos.x,
      initialPosY: pos.y
    };
  };

  const handlePointerMove = (e) => {
    if (dragging) {
      setPos({
        x: dragRef.current.initialPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.initialPosY + (e.clientY - dragRef.current.startY)
      });
    }
  };

  const handlePointerUp = (e) => {
    if (dragging) {
      setDragging(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Resizing logic
  const handleResizeDown = (e) => {
    e.stopPropagation(); // don't trigger drag
    bringToFront();
    setResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialW: size.w,
      initialH: size.h
    };
  };

  const handleResizeMove = (e) => {
    if (resizing) {
      setSize({
        w: Math.max(300, resizeRef.current.initialW + (e.clientX - resizeRef.current.startX)),
        h: Math.max(150, resizeRef.current.initialH + (e.clientY - resizeRef.current.startY))
      });
    }
  };

  const handleResizeUp = (e) => {
    if (resizing) {
      setResizing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div 
      className="pg"
      onPointerDown={() => bringToFront()}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: isMinimized ? 300 : size.w,
        height: isMinimized ? 'auto' : size.h,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: dragging || resizing ? 'rgba(0,0,0,0.4) 0px 30px 60px' : 'var(--sh)',
        transition: dragging || resizing ? 'none' : 'width 0.2s, height 0.2s',
        zIndex: 1 // relying on DOM order + pointer down to bubble the parent array
      }}
    >
      {/* Title Bar */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          padding: '11px 13px', cursor: dragging ? 'grabbing' : 'grab',
          borderBottom: isMinimized ? 'none' : '1px solid var(--bd)',
          background: 'rgba(255,255,255,0.02)'
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: iconColor || 'var(--inf)' }}></span>
          {title}
        </span>
        <div style={{ display: 'flex', gap: 6 }} onPointerDown={e => e.stopPropagation() /* Prevent dragging when clicking buttons */}>
          <button 
            onClick={() => setIsMinimized(!isMinimized)} 
            style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'var(--inp)', color: 'var(--tx)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isMinimized ? '☐' : '━'}
          </button>
          <button 
            onClick={onClose} 
            style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'rgba(255,59,92,0.1)', color: 'var(--dn)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Content */}
      {!isMinimized && (
        <div style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
          {children}
          
          {/* Resize Handle */}
          <div 
            onPointerDown={handleResizeDown}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 16,
              height: 16,
              cursor: 'nwse-resize',
              background: 'linear-gradient(135deg, transparent 50%, var(--bd) 50%)',
              zIndex: 100
            }}
          />
        </div>
      )}
    </div>
  );
}
