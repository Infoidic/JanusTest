import { useEffect, useRef, useState } from "react";

export const useMeetSocket = ({ meetId, token, onMessage, onOpen, onClose, localVideoRef }) => {
  const wsRef = useRef(null);
  const [isSocketConnect, setIsSocketConnect] = useState(false);

  const connectSocket = () => {
    if (!meetId || !token || wsRef.current?.readyState === WebSocket.OPEN)  return;

    const ws = new WebSocket(`wss://mtbk.estoesunaprueba.fun:8050/ws/meetrtc/${meetId}/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = (event) => {
      console.log("✅ Socket Django Channels conectado:", event);
      setIsSocketConnect(true);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      console.log("📩 Mensaje recibido:", event.data);
      onMessage?.(JSON.parse(event.data));
    };

    ws.onerror = (err) => {
      console.error("❌ Error WebSocket", err);
    };


    ws.onclose = () => {
      console.log("🛑 WebSocket cerrado");
      setIsSocketConnect(false)
      if (localVideoRef?.current) {
        localVideoRef.current.srcObject = null;
      }
      onClose?.();
    };

  };

  const closeSocket = () => {
      if (wsRef.current.readyState === WebSocket.OPEN){
        wsRef.current.close()
      } 
  }

  const sendMessage = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { connectSocket, sendMessage, closeSocket, isSocketConnect };
};

