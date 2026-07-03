import React from "react";
import { useSocket } from "./hooks/useSocket.js";
import OfficeLayout from "./components/OfficeLayout.jsx";
import DeviceStatusPanel from "./components/DeviceStatusPanel.jsx";
import PowerMeter from "./components/PowerMeter.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";

export default function App() {
  const { snapshot, alerts, connected } = useSocket();

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400 font-body">
        Connecting to office backend...
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-stone-50 tracking-tight">
            Office Pulse
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Live devices, power draw, and anomalies across all 3 rooms.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-teal animate-pulse-glow" : "bg-alertred"}`}
          />
          <span className="text-stone-400">{connected ? "LIVE" : "DISCONNECTED"}</span>
        </div>
      </header>

      <section className="bg-base-800/70 border border-base-600 rounded-2xl p-5 mb-6">
        <OfficeLayout devices={snapshot.devices} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DeviceStatusPanel devices={snapshot.devices} />
        </div>
        <div className="space-y-6">
          <PowerMeter
            totalWatts={snapshot.totalWatts}
            byRoom={snapshot.byRoom}
            todayKwh={snapshot.todayKwh}
          />
        </div>
      </div>

      <div className="mt-6">
        <AlertsPanel alerts={alerts} />
      </div>

      <footer className="mt-10 text-center text-xs text-stone-600 font-mono">
        Backend + Web Dashboard + Discord Bot share one live source of truth.
      </footer>
    </div>
  );
}
