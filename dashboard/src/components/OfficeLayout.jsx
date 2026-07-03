import React from "react";

/**
 * OfficeLayout
 * ---------------------------------------------------------------------------
 * A hand-drawn (SVG) top-down floor plan of the 3 rooms. Lights glow amber
 * when ON, fans spin + glow teal when ON. This is the dashboard's signature
 * element - the same information as the status panel, but felt spatially,
 * the way the boss would actually look at his office.
 * ---------------------------------------------------------------------------
 */

const ROOM_WIDTH = 300;
const ROOM_HEIGHT = 380;
const TOP = 20;

const ROOMS = [
  { key: "drawing", label: "Drawing Room", x: 0, floor: "#e7dcc7", furniture: "sofa" },
  { key: "work1", label: "Work Room 1", x: ROOM_WIDTH, floor: "#dee2ea", furniture: "desks" },
  { key: "work2", label: "Work Room 2", x: ROOM_WIDTH * 2, floor: "#d9c8a6", furniture: "desks" },
];

// device positions relative to a room's local (0,0) top-left corner
const LAYOUT = {
  "light-1": { x: 55, y: 45 },
  "fan-1": { x: 150, y: 55 },
  "light-2": { x: 245, y: 45 },
  "fan-2": { x: 150, y: 235 },
  "light-3": { x: 150, y: 340 },
};

function deviceKey(room, device) {
  return `${room.key}-${device.type}-${device.index}`;
}

function indexDevices(devices) {
  // group + index within room/type so we can look up LAYOUT positions
  const counters = {};
  const byId = {};
  for (const d of devices) {
    const ckey = `${d.roomKey}-${d.type}`;
    counters[ckey] = (counters[ckey] || 0) + 1;
    byId[d.id] = { ...d, index: counters[ckey] };
  }
  return byId;
}

export default function OfficeLayout({ devices }) {
  const indexed = indexDevices(devices || []);
  const byRoomAndPos = {};
  for (const d of Object.values(indexed)) {
    const posKey = `${d.type}-${d.index}`;
    byRoomAndPos[`${d.roomKey}:${posKey}`] = d;
  }

  return (
    <svg
      viewBox={`0 0 ${ROOM_WIDTH * 3} ${ROOM_HEIGHT + TOP + 30}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Top-down office floor plan showing live device status"
    >
      <defs>
        <filter id="glowAmber" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glowTeal" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="bulbOn" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#fff6df" />
          <stop offset="45%" stopColor="#ffc069" />
          <stop offset="100%" stopColor="#c98a2c" />
        </radialGradient>
      </defs>

      {/* outer wall frame */}
      <rect
        x="0"
        y={TOP}
        width={ROOM_WIDTH * 3}
        height={ROOM_HEIGHT}
        rx="10"
        fill="#232938"
      />

      {ROOMS.map((room) => (
        <g key={room.key} transform={`translate(${room.x}, ${TOP})`}>
          {/* floor */}
          <rect
            x="6"
            y="6"
            width={ROOM_WIDTH - 12}
            height={ROOM_HEIGHT - 12}
            rx="6"
            fill={room.floor}
          />

          {/* door arch cut-out at bottom */}
          <path
            d={`M ${ROOM_WIDTH / 2 - 26} ${ROOM_HEIGHT - 12} A 26 26 0 0 1 ${
              ROOM_WIDTH / 2 + 26
            } ${ROOM_HEIGHT - 12}`}
            fill="none"
            stroke="#8b8378"
            strokeWidth="3"
            opacity="0.5"
          />

          {/* furniture */}
          {room.furniture === "sofa" ? (
            <Sofa />
          ) : (
            <>
              <Desk x={40} y={95} />
              <Desk x={190} y={95} />
              <Desk x={40} y={255} />
              <Desk x={190} y={255} />
            </>
          )}

          {/* plant */}
          <Plant x={ROOM_WIDTH - 40} y={ROOM_HEIGHT - 60} />

          {/* devices */}
          {["light-1", "fan-1", "light-2", "fan-2", "light-3"].map((posKey) => {
            const device = byRoomAndPos[`${room.key}:${posKey}`];
            const pos = LAYOUT[posKey];
            if (!device || !pos) return null;
            return device.type === "fan" ? (
              <Fan key={device.id} x={pos.x} y={pos.y} on={device.status === "on"} label={device.name} />
            ) : (
              <Light key={device.id} x={pos.x} y={pos.y} on={device.status === "on"} label={device.name} />
            );
          })}

          {/* room label */}
          <text
            x={ROOM_WIDTH / 2}
            y={ROOM_HEIGHT - 24}
            textAnchor="middle"
            className="font-display"
            fontSize="15"
            fontWeight="700"
            fill="#4b4536"
            letterSpacing="1.5"
          >
            {room.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Light({ x, y, on, label }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>{`${label}: ${on ? "ON" : "OFF"}`}</title>
      <circle
        r="14"
        fill={on ? "url(#bulbOn)" : "#aca696"}
        stroke={on ? "#c98a2c" : "#8b8378"}
        strokeWidth="1.5"
        filter={on ? "url(#glowAmber)" : undefined}
        className={on ? "animate-pulse-glow" : ""}
      />
      <circle r="4.5" fill={on ? "#fffaf0" : "#88816f"} />
    </g>
  );
}

function Fan({ x, y, on, label }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>{`${label}: ${on ? "ON" : "OFF"}`}</title>
      <circle r="17" fill="#3a4152" opacity="0.15" />
      <g className={on ? "animate-spin-fan" : ""} filter={on ? "url(#glowTeal)" : undefined}>
        {[0, 120, 240].map((deg) => (
          <ellipse
            key={deg}
            cx="0"
            cy="-9"
            rx="4.5"
            ry="10"
            fill={on ? "#5eead4" : "#8f9bb0"}
            transform={`rotate(${deg})`}
          />
        ))}
      </g>
      <circle r="3.5" fill={on ? "#0f766e" : "#4b5468"} />
    </g>
  );
}

function Sofa() {
  return (
    <g transform="translate(30, 130)">
      <rect x="0" y="0" width="120" height="70" rx="10" fill="#8a6b52" />
      <rect x="0" y="0" width="120" height="18" rx="8" fill="#725640" />
      <rect x="-10" y="-6" width="140" height="70" rx="12" fill="none" stroke="#5f4632" strokeWidth="2" opacity="0.3" />
      <rect x="10" y="80" width="60" height="34" rx="4" fill="#7a6146" />
    </g>
  );
}

function Desk({ x, y }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="60" height="34" rx="3" fill="#7a5a3a" />
      <rect x="6" y="6" width="20" height="12" rx="1" fill="#3a3f4d" opacity="0.85" />
      <circle cx="30" cy="46" r="9" fill="#33384a" />
    </g>
  );
}

function Plant({ x, y }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-8" y="10" width="16" height="12" rx="2" fill="#6b5a46" />
      <circle cx="0" cy="0" r="12" fill="#3f7a52" />
      <circle cx="-6" cy="4" r="8" fill="#4d8e5f" />
      <circle cx="7" cy="3" r="8" fill="#4d8e5f" />
    </g>
  );
}
