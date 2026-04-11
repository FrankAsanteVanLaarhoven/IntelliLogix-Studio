import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function AiCopilotPanel({ onClose, items = [], wires = [] }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'I am your AI Hardware Copilot. I actively monitor your Sandbox workspace. What logic would you like me to generate for your deployed topology?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userLine = input;
    setMessages(prev => [...prev, { role: 'user', text: userLine }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let setupLogic = '  Serial.begin(9600);\n';
      let loopLogic = '';
      
      const hasMotor = items.some(i => i.type === 'motor');
      const hasSensor = items.some(i => i.type === 'sensor');
      const hasLED = items.some(i => i.type === 'output');
      const hasPLC = items.some(i => i.type === 'plc');
      
      if (hasPLC) {
         setupLogic += '  // PLC Bus Interface (Modbus RTU)\n  ModbusRTU.begin(19200);\n';
      }
      if (hasMotor) {
         setupLogic += '  pinMode(9, OUTPUT); // Actuator Drive PWM\n';
         loopLogic += '  analogWrite(9, 128); // Standard 50% thrust\n';
      }
      if (hasLED) {
         setupLogic += '  pinMode(13, OUTPUT);\n';
         loopLogic += '  digitalWrite(13, millis() % 1000 > 500); // Heartbeat toggle\n';
      }
      if (hasSensor) {
         setupLogic += '  pinMode(A0, INPUT);\n';
         loopLogic += '  int sns = analogRead(A0);\n';
         loopLogic += '  Serial.println(String("{\\"val\\":" + String(sns) + "}"));\n';
      } else {
         loopLogic += '  // Simulated Telemetry (No Physical Sensors Detected)\n';
         loopLogic += '  Serial.println(String("{\\"val\\":" + String(random(0,1024)) + "}"));\n';
         loopLogic += '  delay(500);\n';
      }

      const codeSnippet = `void setup() {\n${setupLogic}}\n\nvoid loop() {\n${loopLogic}}`;

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `Here is the optimized SOTA firmware based exactly on the **${items.length} hardware nodes** and **${wires.length} physical pathways** currently deployed in your Sandbox schema:\n\n\`\`\`cpp\n${codeSnippet}\n\`\`\`\n\nFlash this over the USB backplane when ready!` 
      }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="copilot-panel" style={{ width: 350, background: 'var(--inp)', borderLeft: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', zIndex: 50, position: 'relative' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--bd)', background: 'var(--sf)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ac)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} /> AI Code Generation
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 0, color: 'var(--t3)', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13, lineHeight: 1.5 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 600, textTransform: 'uppercase' }}>{m.role === 'user' ? 'You' : 'NEXUS Copilot'}</span>
            <div style={{ 
              background: m.role === 'user' ? 'var(--acm)' : 'var(--bg)', 
              color: m.role === 'user' ? 'var(--ac)' : 'var(--tx)',
              padding: '10px 14px', borderRadius: 12, border: `1px solid ${m.role === 'user' ? 'var(--ac)' : 'var(--bd)'}`,
              maxWidth: '90%'
            }}>
              {m.text.includes('```') ? (
                <div>
                  <div style={{ marginBottom: 8 }}>{m.text.split('```')[0]}</div>
                  <pre style={{ background: '#0d1117', padding: 12, borderRadius: 8, overflowX: 'auto', fontSize: 11, color: '#e6edf3', border: '1px solid #30363d' }}>
                    <code>{m.text.split('```')[1].replace('cpp\\n', '')}</code>
                  </pre>
                  <div style={{ marginTop: 8 }}>{m.text.split('```')[2]}</div>
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 12, background: 'var(--bg)', borderRadius: 12, width: 'fit-content', border: '1px solid var(--bd)' }}>
            <div style={{ width: 6, height: 6, background: 'var(--ac)', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
            <div style={{ width: 6, height: 6, background: 'var(--ac)', borderRadius: '50%', animation: 'pulse 1s infinite 0.2s' }} />
            <div style={{ width: 6, height: 6, background: 'var(--ac)', borderRadius: '50%', animation: 'pulse 1s infinite 0.4s' }} />
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--bd)', background: 'var(--sf)' }}>
        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Describe logic..."
            style={{ width: '100%', padding: '10px 32px 10px 12px', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: 20, color: 'var(--tx)', fontSize: 12, outline: 'none' }}
          />
          <button type="submit" disabled={!input} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: input ? 'var(--ac)' : 'transparent', color: input ? '#000' : 'var(--t3)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}
