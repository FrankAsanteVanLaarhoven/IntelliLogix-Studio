import { useState, useCallback, useRef } from 'react';

export function useWebSerial(defaultBaudRate = 9600) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const writerRef = useRef(null);
  const keepReadingRef = useRef(true);

  // Parse incoming TextStream lines
  const readLoop = async () => {
    while (portRef.current?.readable && keepReadingRef.current) {
      const textDecoder = new TextDecoderStream();
      portRef.current.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable
        .pipeThrough(new TransformStream(new LineBreakTransformer()))
        .getReader();
      
      readerRef.current = reader;

      try {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) {
            break; // Reader released or stream closed
          }
          if (value) {
            try {
              // Try parsing JSON if device emits structured telemetry
              const json = JSON.parse(value);
              setLastMessage(json);
            } catch {
              setLastMessage({ raw: value });
            }
          }
        }
      } catch (err) {
        console.error("Serial read error:", err);
      } finally {
        reader.releaseLock();
      }
    }
  };

  const connect = useCallback(async () => {
    if (!('serial' in navigator)) {
      alert("Web Serial API not supported in this browser. Please use Chrome/Edge.");
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: defaultBaudRate });
      
      portRef.current = port;
      
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      writerRef.current = textEncoder.writable.getWriter();
      
      keepReadingRef.current = true;
      setIsConnected(true);
      
      // Start async read loop
      readLoop();
      
    } catch (err) {
      console.error("Failed to connect to Serial Port", err);
      setIsConnected(false);
    }
  }, [defaultBaudRate]);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;
    if (readerRef.current) {
      await readerRef.current.cancel();
      readerRef.current = null;
    }
    if (writerRef.current) {
      await writerRef.current.close();
      writerRef.current = null;
    }
    if (portRef.current) {
      await portRef.current.close();
      portRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const writeCommand = useCallback(async (cmdObject) => {
    if (!isConnected || !writerRef.current) {
      console.warn("Serial port not connected.");
      return;
    }
    try {
      const payload = typeof cmdObject === 'string' ? cmdObject : JSON.stringify(cmdObject);
      // Ensure commands end with a newline for Arduino to easily parse standard Line endings
      await writerRef.current.write(payload + '\\n');
    } catch (err) {
      console.error("Serial write error:", err);
    }
  }, [isConnected]);

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    writeCommand
  };
}

// Utility transformer to chunk Uint8 stream by newlines to form proper text messages
class LineBreakTransformer {
  constructor() {
    this.chunks = "";
  }
  transform(chunk, controller) {
    this.chunks += chunk;
    const lines = this.chunks.split("\\r\\n"); // Arduino typically uses CRLF
    this.chunks = lines.pop(); // Keep incomplete line string buffered
    lines.forEach(line => controller.enqueue(line));
  }
  flush(controller) {
    if (this.chunks) {
      controller.enqueue(this.chunks);
    }
  }
}
