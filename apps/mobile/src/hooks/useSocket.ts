import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

interface UseSocketOptions {
  autoConnect?: boolean;
  events?: Record<string, (data: any) => void>;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true, events = {} } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    let mounted = true;

    (async () => {
      const s = await connectSocket();
      if (mounted) socketRef.current = s;

      // Register event listeners
      Object.entries(events).forEach(([event, handler]) => {
        s.on(event, handler);
      });
    })();

    return () => {
      mounted = false;
      // Remove only our listeners, don't disconnect (socket is shared)
      const s = getSocket();
      if (s) {
        Object.keys(events).forEach((event) => {
          s.off(event);
        });
      }
    };
  }, [autoConnect]);

  const emit = useCallback((event: string, data?: unknown) => {
    const s = socketRef.current || getSocket();
    if (s?.connected) {
      s.emit(event, data);
    } else {
      console.warn('[useSocket] Not connected, cannot emit:', event);
    }
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    const s = socketRef.current || getSocket();
    s?.on(event, handler);
    return () => s?.off(event, handler);
  }, []);

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    const s = socketRef.current || getSocket();
    if (handler) {
      s?.off(event, handler);
    } else {
      s?.off(event);
    }
  }, []);

  return { emit, on, off, socket: socketRef.current };
}
