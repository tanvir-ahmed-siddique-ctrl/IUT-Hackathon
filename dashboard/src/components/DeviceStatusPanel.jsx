import React from "react";

const ROOM_ORDER = ["Drawing Room", "Work Room 1", "Work Room 2"];

export default function DeviceStatusPanel({ devices }) {
  const byRoom = ROOM_ORDER.map((room) => ({
    room,
    devices: devices.filter((d) => d.room === room),
  }));

  return (
    <div className="bg-base-800/70 border border-base-600 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold text-stone-100">
          Live Device Status
        </h2>
        <span className="text-xs font-mono text-stone-400">
          {devices.filter((d) => d.status === "on").length}/{devices.length} ON
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {byRoom.map(({ room, devices }) => (
          <div key={room} className="bg-base-900/60 rounded-xl p-3 border border-base-600/70">
            <h3 className="text-xs font-display font-semibold tracking-wide text-stone-400 uppercase mb-2">
              {room}
            </h3>
            <ul className="space-y-1.5">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between text-sm rounded-lg px-2 py-1.5 bg-base-800/60"
                >
                  <span className="flex items-center gap-2 text-stone-200">
                    <DeviceIcon type={d.type} on={d.status === "on"} />
                    {d.name}
                  </span>
                  <StatusPill on={d.status === "on"} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceIcon({ type, on }) {
  const color = on ? (type === "fan" ? "text-teal" : "text-amber") : "text-stone-500";
  return (
    <span className={`text-xs ${color}`}>
      {type === "fan" ? "◍" : "●"}
    </span>
  );
}

function StatusPill({ on }) {
  return (
    <span
      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
        on
          ? "bg-amber/15 text-amber border border-amber/40"
          : "bg-stone-700/30 text-stone-400 border border-stone-600/40"
      }`}
    >
      {on ? "ON" : "OFF"}
    </span>
  );
}
