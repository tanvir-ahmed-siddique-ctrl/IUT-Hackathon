import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/**
 * Owns the single Socket.IO connection for the dashboard and keeps
 * `snapshot` (devices + power totals) and `alerts` in sync in real time -
 * no polling, no manual refresh.
 */
export function useSocket() {
  const socketRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("devices:update", (data) => setSnapshot(data));

    socket.on("device:changed", (device) => {
      setSnapshot((prev) => {
        if (!prev) return prev;
        const devices = prev.devices.map((d) => (d.id === device.id ? device : d));
        return { ...prev, devices };
      });
    });

    socket.on("alerts:new", (newAlerts) => {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 30));
    });

    // seed with any alerts already on the backend
    fetch(`${BACKEND_URL}/api/alerts`)
      .then((r) => r.json())
      .then((data) => setAlerts(data.alerts || []))
      .catch(() => {});

    return () => socket.disconnect();
  }, []);

  return { snapshot, alerts, connected };
}
