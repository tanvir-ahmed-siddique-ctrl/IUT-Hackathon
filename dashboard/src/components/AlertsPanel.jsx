import React from "react";

export default function AlertsPanel({ alerts }) {
  return (
    <div className="bg-base-800/70 border border-base-600 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-stone-100">Active Alerts</h2>
        {alerts.length > 0 && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-alertred/15 text-alertred border border-alertred/40">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-stone-500 italic">
          No anomalies right now — everything looks normal.
        </p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`text-sm rounded-lg px-3 py-2 border ${
                a.level === "critical"
                  ? "bg-alertred/10 border-alertred/40 text-red-200"
                  : "bg-amber/10 border-amber/40 text-amber-100"
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <span>{a.message}</span>
              </div>
              <span className="block mt-1 text-[10px] font-mono text-stone-400">
                {new Date(a.timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
