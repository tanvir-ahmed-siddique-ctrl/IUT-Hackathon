import React from "react";

export default function PowerMeter({ totalWatts, byRoom, todayKwh }) {
  const maxRoom = Math.max(1, ...Object.values(byRoom || {}));

  return (
    <div className="bg-base-800/70 border border-base-600 rounded-2xl p-5">
      <h2 className="font-display text-lg font-semibold text-stone-100 mb-4">
        Power Consumption
      </h2>

      <div className="flex items-end gap-3 mb-5">
        <span className="font-mono text-4xl font-bold text-amber drop-shadow-[0_0_12px_rgba(255,184,77,0.35)]">
          {totalWatts}
        </span>
        <span className="text-stone-400 mb-1">W right now</span>
      </div>

      <div className="space-y-3 mb-5">
        {Object.entries(byRoom || {}).map(([room, watts]) => (
          <div key={room}>
            <div className="flex justify-between text-xs text-stone-400 mb-1 font-mono">
              <span>{room}</span>
              <span>{watts}W</span>
            </div>
            <div className="h-2 bg-base-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal to-amber rounded-full transition-all duration-700"
                style={{ width: `${(watts / maxRoom) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-base-600/60 flex justify-between items-center">
        <span className="text-xs text-stone-400 uppercase tracking-wide font-display">
          Today's estimated usage
        </span>
        <span className="font-mono text-sm font-semibold text-teal">{todayKwh} kWh</span>
      </div>
    </div>
  );
}
