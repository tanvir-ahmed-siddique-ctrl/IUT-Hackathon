"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const ROOMS = ["Drawing Room", "Work Room 1", "Work Room 2"];
const ROOM_MAX_WATT = 2 * 60 + 3 * 15;
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const POLL_MS = 3000;
const SIM_MS = 3200;
const DEMO_BASE_TS = Date.UTC(2026, 0, 1, 10, 0, 0);

const DEVICE_POSITIONS = {
  "Drawing Room": [
    { type: "fan", idx: 1, x: "58%", y: "34%" },
    { type: "fan", idx: 2, x: "58%", y: "73%" },
    { type: "light", idx: 1, x: "31%", y: "32%" },
    { type: "light", idx: 2, x: "78%", y: "32%" },
    { type: "light", idx: 3, x: "58%", y: "88%" },
  ],
  "Work Room 1": [
    { type: "fan", idx: 1, x: "52%", y: "30%" },
    { type: "fan", idx: 2, x: "52%", y: "67%" },
    { type: "light", idx: 1, x: "23%", y: "25%" },
    { type: "light", idx: 2, x: "81%", y: "25%" },
    { type: "light", idx: 3, x: "52%", y: "86%" },
  ],
  "Work Room 2": [
    { type: "fan", idx: 1, x: "51%", y: "30%" },
    { type: "fan", idx: 2, x: "51%", y: "67%" },
    { type: "light", idx: 1, x: "23%", y: "25%" },
    { type: "light", idx: 2, x: "82%", y: "25%" },
    { type: "light", idx: 3, x: "51%", y: "86%" },
  ],
};

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isOfficeHours(date = new Date()) {
  const hour = date.getHours();
  return hour >= 9 && hour < 17;
}

function buildInitialDevices() {
  const now = DEMO_BASE_TS;
  return ROOMS.flatMap((room, roomIndex) => {
    const devices = [];
    for (let i = 1; i <= 2; i += 1) {
      devices.push({
        id: slug(`${room}-fan-${i}`),
        room,
        type: "fan",
        label: `Fan ${i}`,
        watt: 60,
        on: (roomIndex + i) % 2 === 0,
        lastChanged: now - (roomIndex * 27 + i * 14) * 60 * 1000,
      });
    }
    for (let i = 1; i <= 3; i += 1) {
      devices.push({
        id: slug(`${room}-light-${i}`),
        room,
        type: "light",
        label: `Light ${i}`,
        watt: 15,
        on: (roomIndex + i) % 3 !== 0,
        lastChanged: now - (roomIndex * 21 + i * 9) * 60 * 1000,
      });
    }
    return devices;
  });
}

function normalizeDevice(raw) {
  const rawName = String(raw.label || raw.name || raw.id || "");
  const type = raw.type || (rawName.toLowerCase().includes("fan") ? "fan" : "light");
  const fallbackWatt = type === "fan" ? 60 : 15;
  const on = typeof raw.on === "boolean" ? raw.on : raw.status === "on" || raw.status === true;
  return {
    id: raw.id || slug(`${raw.room}-${raw.label || raw.name || type}`),
    room: raw.room,
    type,
    label: raw.label || raw.name || `${type[0].toUpperCase()}${type.slice(1)}`,
    watt: Number(raw.watt ?? raw.powerDraw ?? raw.power ?? raw.ratedWatt ?? fallbackWatt),
    on,
    lastChanged: Number(raw.lastChanged || Date.parse(raw.last_changed || raw.updatedAt || raw.updated_at) || Date.now()),
  };
}

function normalizeStatus(payload) {
  const devices = Array.isArray(payload) ? payload : payload.devices || [];
  return {
    devices: devices.map(normalizeDevice).filter((device) => ROOMS.includes(device.room)),
    alerts: (payload.alerts || []).map((alert) => ({
      level: alert.level || "warn",
      message: alert.message || alert.text || "Energy event detected.",
      ts: Number(alert.ts || alert.timestamp || Date.now()),
    })),
    power: payload.power || null,
    officeHours: typeof payload.officeHours === "boolean" ? payload.officeHours : isOfficeHours(),
  };
}

async function fetchBackendStatus(backendUrl) {
  const baseUrl = backendUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/status`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Backend responded ${response.status}`);
  return normalizeStatus(await response.json());
}

function roomPowerFrom(devices, power, room) {
  const backendRoom = power?.byRoom?.find?.((entry) => entry.room === room);
  if (backendRoom && Number.isFinite(Number(backendRoom.watt))) return Number(backendRoom.watt);
  return devices.filter((device) => device.room === room && device.on).reduce((sum, device) => sum + device.watt, 0);
}

function totalPowerFrom(devices, power) {
  if (power && Number.isFinite(Number(power.totalWatt))) return Number(power.totalWatt);
  return devices.filter((device) => device.on).reduce((sum, device) => sum + device.watt, 0);
}

function buildAlerts(devices, officeHours, power = null, ts = Date.now()) {
  const alerts = [];
  if (!officeHours) {
    devices.filter((device) => device.on).slice(0, 6).forEach((device) => {
      alerts.push({
        level: "danger",
        message: `${device.label} in ${device.room} is still ON after office hours.`,
        ts,
      });
    });
  }
  ROOMS.forEach((room) => {
    const watt = roomPowerFrom(devices, power, room);
    const roomDevices = devices.filter((device) => device.room === room);
    if (watt >= ROOM_MAX_WATT * 0.75) {
      alerts.push({ level: "warn", message: `${room} is using ${watt}W, close to full load.`, ts });
    }
    if (roomDevices.length && roomDevices.every((device) => device.on)) {
      alerts.push({ level: "warn", message: `${room} has every fan and light running.`, ts });
    }
  });
  return alerts;
}

function mergeAlertHistory(history, alerts) {
  const seen = new Set(history.map((alert) => `${alert.level}:${alert.message}`));
  const additions = alerts
    .filter((alert) => !seen.has(`${alert.level}:${alert.message}`))
    .map((alert) => ({ ...alert, ts: alert.ts || Date.now() }));
  if (!additions.length) return history;
  return [...additions, ...history].slice(0, 40);
}

function fmtTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDate(date = new Date()) {
  return date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function relativeTime(ts, now = Date.now()) {
  const seconds = Math.max(1, Math.floor((now - Number(ts)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function displayRelativeTime(ts, now) {
  return now ? relativeTime(ts, now) : "syncing";
}

function getDevicePosition(device) {
  const index = Number((device.label.match(/\d+/) || ["1"])[0]);
  return (DEVICE_POSITIONS[device.room] || []).find((pos) => pos.type === device.type && pos.idx === index) || { x: "50%", y: "50%" };
}

function FanIcon({ id }) {
  const gradientId = `fanBlade-${id}`;
  return (
    <span className="fan-core" aria-hidden="true">
      <svg className="fan-svg" viewBox="0 0 48 48" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.98" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.42" />
          </linearGradient>
        </defs>
        <path className="blade-shape" fill={`url(#${gradientId})`} d="M24 4.4c5.4 0 9.8 4.1 8.4 9.6-1 3.9-4.5 6.5-8.4 8.3-3.9-1.8-7.4-4.4-8.4-8.3C14.2 8.5 18.6 4.4 24 4.4Z" />
        <path className="blade-shape" fill={`url(#${gradientId})`} transform="rotate(120 24 24)" d="M24 4.4c5.4 0 9.8 4.1 8.4 9.6-1 3.9-4.5 6.5-8.4 8.3-3.9-1.8-7.4-4.4-8.4-8.3C14.2 8.5 18.6 4.4 24 4.4Z" />
        <path className="blade-shape" fill={`url(#${gradientId})`} transform="rotate(240 24 24)" d="M24 4.4c5.4 0 9.8 4.1 8.4 9.6-1 3.9-4.5 6.5-8.4 8.3-3.9-1.8-7.4-4.4-8.4-8.3C14.2 8.5 18.6 4.4 24 4.4Z" />
        <circle className="fan-ring" cx="24" cy="24" r="14.8" />
        <circle className="hub" cx="24" cy="24" r="5.8" />
      </svg>
    </span>
  );
}

function LightIcon() {
  return (
    <span className="light-core" aria-hidden="true">
      <svg className="light-svg" viewBox="0 0 44 44" focusable="false">
        <circle className="light-halo" cx="22" cy="22" r="18" />
        <circle className="light-glass" cx="22" cy="22" r="11" />
        <path className="light-shine" d="M16 15.5c2.2-2.2 6.1-3 9.2-1.8" />
        <circle className="light-cap" cx="22" cy="22" r="4.2" />
      </svg>
    </span>
  );
}

function DeviceNode({ device, selected, now, onSelect }) {
  const pos = getDevicePosition(device);
  const changedText = displayRelativeTime(device.lastChanged, now);
  return (
    <button
      type="button"
      className={`device ${device.type} ${device.on ? "on" : "off"} ${selected ? "selected" : ""}`}
      style={{ "--x": pos.x, "--y": pos.y }}
      aria-label={`${device.room} ${device.label} ${device.on ? "on" : "off"}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(device);
      }}
    >
      {device.type === "fan" ? <FanIcon id={device.id} /> : <LightIcon />}
      <span className="tip">
        {device.label} · {device.on ? "ON" : "OFF"}
        <br />
        {device.on ? device.watt : 0}W · {changedText}
      </span>
    </button>
  );
}

function Fixture({ className, left, top }) {
  return <div className={`fixture ${className}`} style={{ left, top }} />;
}

function Room({ className, room, watt, selected, heat, children, onSelect }) {
  return (
    <div className={`room ${className} ${selected ? "selected" : ""}`} data-room={room} style={{ "--heat": heat }} onClick={() => onSelect(room)}>
      <div className="room-label">
        {room} <span>{watt}W</span>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [devices, setDevices] = useState(() => buildInitialDevices());
  const [alerts, setAlerts] = useState([]);
  const [power, setPower] = useState(null);
  const [officeHours, setOfficeHours] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState("Drawing Room");
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [backendInput, setBackendInput] = useState(DEFAULT_BACKEND_URL);
  const [infoOpen, setInfoOpen] = useState(false);
  const [now, setNow] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const connectedRef = useRef(false);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    const saved = window.localStorage.getItem("officequest.backendUrl");
    if (saved) {
      setBackendUrl(saved);
      setBackendInput(saved);
    }
  }, []);

  useEffect(() => {
    setNow(Date.now());
    setOfficeHours(isOfficeHours());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const next = await fetchBackendStatus(backendUrl);
        if (cancelled || !next.devices.length) return;
        setDevices(next.devices);
        setAlerts(next.alerts);
        setPower(next.power);
        setOfficeHours(next.officeHours);
        setConnected(true);
        setLastSync(Date.now());
      } catch (error) {
        if (cancelled) return;
        setConnected(false);
        setPower(null);
        setOfficeHours(isOfficeHours());
        setAlerts((current) => current.length ? current : buildAlerts(devices, isOfficeHours()));
      }
    }
    sync();
    const timer = setInterval(sync, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [backendUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (connectedRef.current) return;
      setDevices((current) => {
        const index = Math.floor(Math.random() * current.length);
        if (Math.random() >= 0.36) return current;
        return current.map((device, i) => i === index ? { ...device, on: !device.on, lastChanged: Date.now() } : device);
      });
      const nextOfficeHours = isOfficeHours();
      setOfficeHours(nextOfficeHours);
    }, SIM_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (connected) return;
    setAlerts(buildAlerts(devices, officeHours));
  }, [devices, officeHours, connected]);

  const totalPower = totalPowerFrom(devices, power);
  const onDevices = devices.filter((device) => device.on);
  const fansOn = onDevices.filter((device) => device.type === "fan").length;
  const lightsOn = onDevices.filter((device) => device.type === "light").length;
  const loadPct = Math.round((totalPower / (ROOMS.length * ROOM_MAX_WATT)) * 100);
  const currentDate = now ? new Date(now) : null;
  const estimatedKwh = power && Number.isFinite(Number(power.estimatedKwhToday))
    ? Number(power.estimatedKwhToday).toFixed(2)
    : currentDate
      ? ((totalPower / 1000) * (currentDate.getHours() + currentDate.getMinutes() / 60)).toFixed(2)
      : "0.00";
  const moneyEstimate = Math.round(Number(estimatedKwh) * 12.5);
  const visibleAlerts = alerts.length ? alerts : buildAlerts(devices, officeHours, power, now || DEMO_BASE_TS);

  useEffect(() => {
    if (!visibleAlerts.length) return;
    setAlertHistory((current) => mergeAlertHistory(current, visibleAlerts));
  }, [visibleAlerts]);

  const selectedDevice = useMemo(() => {
    return devices.find((device) => device.id === selectedDeviceId)
      || devices.find((device) => device.room === selectedRoom)
      || devices[0];
  }, [devices, selectedDeviceId, selectedRoom]);

  const syncText = connected && lastSync
    ? `Synced ${displayRelativeTime(lastSync, now)} from backend`
    : `Simulator mode - backend unavailable, data changes every ${Math.round(SIM_MS / 1000)}s`;
  const displayTime = currentDate ? fmtTime(currentDate) : "--:--:--";
  const displayDate = currentDate ? fmtDate(currentDate) : "Loading local time";

  function handleBackendConnect() {
    const nextUrl = backendInput.trim() || DEFAULT_BACKEND_URL;
    window.localStorage.setItem("officequest.backendUrl", nextUrl);
    setBackendUrl(nextUrl);
    setConnected(false);
  }

  function selectRoom(room) {
    setSelectedRoom(room);
    setSelectedDeviceId(null);
  }

  function selectDevice(device) {
    setSelectedRoom(device.room);
    setSelectedDeviceId(device.id);
  }

  return (
    <>
      <main className="app">
        <header className="top-strip">
          <div className="brand-mini">
            <div className="logo">⚡</div>
            <div>
              <h1>OfficeQuest</h1>
              <p>Next.js live office energy map</p>
            </div>
          </div>
          <div className="live-chip">
            <span className={`dot ${connected ? "" : "offline"}`} />
            <span>{connected ? "Backend live" : "Simulator mode"}</span>
          </div>
        </header>

        <section className="floor-hero">
          <div className="floor-head">
            <div>
              <h2>Top-view office layout</h2>
              <p>React-powered live floorplan for the fixed hackathon setup: 3 rooms, 2 fans and 3 lights per room, all reading from one backend when available.</p>
            </div>
            <div className="time-stack">
              <div className="time" suppressHydrationWarning>{displayTime}</div>
              <div className="date" suppressHydrationWarning>{displayDate}</div>
            </div>
          </div>

          <div className="plan-stage">
            <div className="office-plan">
              <div className="corridor">
                <Fixture className="plant" left="5%" top="34%" />
                <Fixture className="plant" left="89%" top="36%" />
                <Fixture className="water" left="96%" top="64%" />
              </div>

              <Room className="drawing" room="Drawing Room" watt={roomPowerFrom(devices, power, "Drawing Room")} heat={Math.min(0.38, 0.06 + roomPowerFrom(devices, power, "Drawing Room") / ROOM_MAX_WATT * 0.32).toFixed(2)} selected={selectedRoom === "Drawing Room"} onSelect={selectRoom}>
                <Fixture className="rug" left="48%" top="61%" />
                <Fixture className="sofa" left="15%" top="48%" />
                <Fixture className="table" left="43%" top="53%" />
                <Fixture className="armchair" left="18%" top="80%" />
                <Fixture className="plant" left="10%" top="14%" />
                <Fixture className="plant" left="84%" top="82%" />
                {devices.filter((device) => device.room === "Drawing Room").map((device) => (
                  <DeviceNode key={device.id} device={device} selected={selectedDeviceId === device.id} now={now} onSelect={selectDevice} />
                ))}
              </Room>

              <Room className="work1" room="Work Room 1" watt={roomPowerFrom(devices, power, "Work Room 1")} heat={Math.min(0.38, 0.06 + roomPowerFrom(devices, power, "Work Room 1") / ROOM_MAX_WATT * 0.32).toFixed(2)} selected={selectedRoom === "Work Room 1"} onSelect={selectRoom}>
                {["24", "76"].map((left) => [34, 72].map((top) => <Fixture key={`${left}-${top}-desk`} className="desk" left={`${left}%`} top={`${top}%`} />))}
                {["24", "76"].map((left) => [49, 87].map((top) => <Fixture key={`${left}-${top}-chair`} className="chair" left={`${left}%`} top={`${top}%`} />))}
                {devices.filter((device) => device.room === "Work Room 1").map((device) => (
                  <DeviceNode key={device.id} device={device} selected={selectedDeviceId === device.id} now={now} onSelect={selectDevice} />
                ))}
              </Room>

              <Room className="work2" room="Work Room 2" watt={roomPowerFrom(devices, power, "Work Room 2")} heat={Math.min(0.38, 0.06 + roomPowerFrom(devices, power, "Work Room 2") / ROOM_MAX_WATT * 0.32).toFixed(2)} selected={selectedRoom === "Work Room 2"} onSelect={selectRoom}>
                {["24", "76"].map((left) => [34, 72].map((top) => <Fixture key={`${left}-${top}-desk`} className="desk" left={`${left}%`} top={`${top}%`} />))}
                {["24", "76"].map((left) => [49, 87].map((top) => <Fixture key={`${left}-${top}-chair`} className="chair" left={`${left}%`} top={`${top}%`} />))}
                <Fixture className="plant" left="88%" top="39%" />
                {devices.filter((device) => device.room === "Work Room 2").map((device) => (
                  <DeviceNode key={device.id} device={device} selected={selectedDeviceId === device.id} now={now} onSelect={selectDevice} />
                ))}
              </Room>

              <div className="window w-top" style={{ left: "8%" }} />
              <div className="window w-top" style={{ left: "44%" }} />
              <div className="window w-top" style={{ left: "78%" }} />
              <div className="window w-left" />
              <div className="window w-right" />
              <div className="door d1" />
              <div className="door d2" />
              <div className="door d3" />
              <div className="door d4" />
              <div className="entry">ENTRY</div>
            </div>
            <SelectedDeviceBubble device={selectedDevice} now={now} />
          </div>

          <div className="floor-footer">
            <div className="legend">
              <span>💡 light</span>
              <span>🌀 fan</span>
              <span>yellow glow = on</span>
              <span>green glow = active fan</span>
            </div>
            <div>{syncText}</div>
          </div>
        </section>

        <section className="insights-deck">
          <UsageShowcase
            totalPower={totalPower}
            estimatedKwh={estimatedKwh}
            moneyEstimate={moneyEstimate}
            onCount={onDevices.length}
            totalDevices={devices.length}
            fansOn={fansOn}
            lightsOn={lightsOn}
            loadPct={loadPct}
            officeHours={officeHours}
          />
          <RoomHealth devices={devices} power={power} selectedRoom={selectedRoom} onSelect={selectRoom} />
          <AlertsPanel alerts={alertHistory.length ? alertHistory : visibleAlerts} currentCount={visibleAlerts.length} now={now} />
          <DeviceInventory devices={devices} selectedDeviceId={selectedDeviceId} now={now} onSelect={selectDevice} />
        </section>

        <div className="footer">
          Next.js frontend is backend-ready. Set <code>NEXT_PUBLIC_BACKEND_URL</code> or use the floating ⚡ modal. Backend can be Node, Python, or anything that returns the documented JSON.
        </div>
      </main>

      <button className="info-toggle" type="button" aria-label="Open project info" onClick={() => setInfoOpen((open) => !open)}>⚡</button>
      <aside className={`info-modal ${infoOpen ? "open" : ""}`} aria-hidden={!infoOpen}>
        <div className="info-body">
          <div className="info-title">
            <div className="logo">⚡</div>
            <div>
              <div className="eyebrow">OfficeQuest hackathon demo</div>
              <strong>Live Energy Command Center</strong>
            </div>
          </div>
          <p className="info-copy">Next.js + React dashboard for Drawing Room, Work Room 1, and Work Room 2. It polls one shared backend so the web UI and Discord bot always show the same simulated device truth.</p>
          <div className="modal-pills">
            <span>15 fixed devices</span>
            <span>2 fans + 3 lights per room</span>
            <span>Backend-ready API adapter</span>
            <span>Simulator fallback included</span>
          </div>
          <div className="modal-lines">
            <div className="modal-line"><span>Clock</span><strong suppressHydrationWarning>{displayTime}</strong></div>
            <div className="modal-line"><span>Date</span><strong suppressHydrationWarning>{displayDate}</strong></div>
            <div className="modal-line"><span>Mode</span><strong>{officeHours ? "Office Hours" : "After Hours"}</strong></div>
            <div className="modal-line"><span>Status</span><strong>{connected ? "Backend live" : "Simulator mode"}</strong></div>
            <div className="modal-line"><span>Sync</span><strong>{connected && lastSync ? displayRelativeTime(lastSync, now) : "offline"}</strong></div>
          </div>
          <div className="backend-box">
            <label htmlFor="backendUrl">Backend status endpoint base URL</label>
            <div className="backend-row">
              <input id="backendUrl" value={backendInput} onChange={(event) => setBackendInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && handleBackendConnect()} aria-label="Backend URL" />
              <button className="connect-btn" type="button" onClick={handleBackendConnect}>Connect</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function UsageShowcase({ totalPower, estimatedKwh, moneyEstimate, onCount, totalDevices, fansOn, lightsOn, loadPct, officeHours }) {
  return (
    <article className="insight-card usage-showcase">
      <div className="insight-head">
        <div>
          <span className="kicker">Live usage snapshot</span>
          <h3>{totalPower}W</h3>
          <p>{onCount}/{totalDevices} devices running right now</p>
        </div>
        <span className={`status-pill ${officeHours ? "open" : "after"}`}>{officeHours ? "Office Hours" : "After Hours"}</span>
      </div>
      <div className="power-dial" style={{ "--load": `${Math.min(loadPct, 100)}%` }}>
        <div>
          <strong>{loadPct}%</strong>
          <span>office load</span>
        </div>
      </div>
      <div className="usage-strip">
        <span><b>{estimatedKwh}</b> kWh today</span>
        <span><b>৳{moneyEstimate}</b> estimated</span>
        <span><b>{fansOn}/6</b> fans</span>
        <span><b>{lightsOn}/9</b> lights</span>
      </div>
    </article>
  );
}

function RoomHealth({ devices, power, selectedRoom, onSelect }) {
  return (
    <article className="insight-card room-health-card">
      <div className="insight-head">
        <div>
          <span className="kicker">Per-room status</span>
          <h3>Room health</h3>
          <p>Click a room here or directly on the office layout.</p>
        </div>
      </div>
      <div className="room-list">
        {ROOMS.map((room) => {
          const roomDevices = devices.filter((device) => device.room === room);
          const onCount = roomDevices.filter((device) => device.on).length;
          const watt = roomPowerFrom(devices, power, room);
          const pct = Math.round((watt / ROOM_MAX_WATT) * 100);
          return (
            <article key={room} className={`room-row ${room === selectedRoom ? "selected" : ""}`} onClick={() => onSelect(room)}>
              <div className="row-head">
                <div>
                  <div className="row-title">{room}</div>
                  <div className="row-sub">{onCount}/5 devices ON · {pct}% room load</div>
                </div>
                <span className="chip">{watt}W</span>
              </div>
              <div className="meter"><span style={{ "--w": `${pct}%` }} /></div>
            </article>
          );
        })}
      </div>
    </article>
  );
}

function SelectedDeviceBubble({ device, now }) {
  if (!device) {
    return <aside className="selected-bubble">Waiting for device data</aside>;
  }
  return (
    <aside className={`selected-bubble ${device.on ? "active" : ""}`}>
      <div className="bubble-icon">{device.type === "fan" ? "🌀" : "💡"}</div>
      <div>
        <span className="kicker">Selected device</span>
        <h3>{device.label}</h3>
        <p>{device.room}</p>
      </div>
      <div className="bubble-stats">
        <span><b>{device.on ? "ON" : "OFF"}</b>Status</span>
        <span><b>{device.on ? device.watt : 0}W</b>Now</span>
        <span><b>{displayRelativeTime(device.lastChanged, now)}</b>Changed</span>
      </div>
    </aside>
  );
}

function AlertsPanel({ alerts, currentCount, now }) {
  return (
    <article className="insight-card alerts-card">
      <div className="insight-head">
        <div>
          <span className="kicker">Alert timeline</span>
          <h3>Energy alerts</h3>
          <p>Scroll kore previous alerts-o dekhte parba.</p>
        </div>
        <span className="status-pill after">{currentCount} active</span>
      </div>
      <div className="alerts scroll-panel">
        {!alerts.length ? (
          <div className="empty">✅ All clear right now</div>
        ) : alerts.map((alert, index) => (
          <article key={`${alert.message}-${index}`} className={`alert ${alert.level === "danger" ? "danger" : ""}`}>
            <div>{alert.level === "danger" ? "🚨" : "⚠️"}</div>
            <div>
              <div className="row-title">{alert.message}</div>
              <div className="row-sub">Flagged {displayRelativeTime(alert.ts, now)}</div>
            </div>
          </article>
        ))}
      </div>
    </article>
  );
}

function DeviceInventory({ devices, selectedDeviceId, now, onSelect }) {
  const sorted = [...devices].sort((a, b) => ROOMS.indexOf(a.room) - ROOMS.indexOf(b.room) || a.type.localeCompare(b.type) || a.label.localeCompare(b.label));
  return (
    <article className="insight-card inventory-card">
      <div className="insight-head">
        <div>
          <span className="kicker">Device matrix</span>
          <h3>Device inventory</h3>
          <p>All devices with power draw and last changed time.</p>
        </div>
      </div>
      <div className="device-list scroll-panel">
        {sorted.map((device) => (
          <article key={device.id} className={`device-row ${device.on ? "on" : ""} ${selectedDeviceId === device.id ? "selected" : ""}`} onClick={() => onSelect(device)}>
            <div className="device-icon">{device.type === "fan" ? "🌀" : "💡"}</div>
            <div>
              <div className="row-title">{device.room} · {device.label}</div>
              <div className="row-sub">{device.type.toUpperCase()} · {device.watt}W rated · changed {displayRelativeTime(device.lastChanged, now)}</div>
            </div>
            <span className="chip state">{device.on ? "ON" : "OFF"}</span>
          </article>
        ))}
      </div>
    </article>
  );
}
