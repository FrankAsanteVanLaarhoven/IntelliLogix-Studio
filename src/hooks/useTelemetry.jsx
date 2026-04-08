import { useState, useEffect } from 'react';

export const useTelemetry = () => {
  const [data, setData] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      setConnected(true);
      console.log('Connected to telemetry WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'TELEMETRY_TICK') {
          setData(payload.data);
        }
      } catch (err) {
        console.error('Error parsing telemetry data:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('Telemetry WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  return { data, connected };
};
