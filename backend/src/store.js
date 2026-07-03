/**
 * store.js
 * ---------------------------------------------------------------------------
 * The single in-memory "source of truth" for every device in the office.
 * Both the REST API (used by the dashboard + Discord bot) and the Socket.IO
 * broadcaster read from / write to this same store, so the web UI and the
 * bot can never disagree about the current state of the office.
 *
 * 3 rooms x (2 fans + 3 lights) = 5 devices/room = 15 devices total.
 * (See README.md -> "A note on device count" for why this project uses 15.)
 * ---------------------------------------------------------------------------
 */

const ROOMS = [
  { key: "drawing", name: "Drawing Room" },
  { key: "work1", name: "Work Room 1" },
  { key: "work2", name: "Work Room 2" },
];

const WATTAGE = {
  fan: 60,
  light: 15,
};

function buildInitialDevices() {
  const devices = [];
  const now = new Date().toISOString();

  for (const room of ROOMS) {
    for (let i = 1; i <= 2; i++) {
      devices.push({
        id: `${room.key}-fan-${i}`,
        name: `Fan ${i}`,
        type: "fan",
        roomKey: room.key,
        room: room.name,
        status: Math.random() > 0.6 ? "on" : "off",
        wattage: WATTAGE.fan,
        lastChanged: now,
      });
    }
    for (let i = 1; i <= 3; i++) {
      devices.push({
        id: `${room.key}-light-${i}`,
        name: `Light ${i}`,
        type: "light",
        roomKey: room.key,
        room: room.name,
        status: Math.random() > 0.6 ? "on" : "off",
        wattage: WATTAGE.light,
        lastChanged: now,
      });
    }
  }
  return devices;
}

const state = {
  devices: buildInitialDevices(),
  // running total of energy used today, in watt-hours. The simulator adds to
  // this every tick based on how much power was drawn during that tick.
  todayWattHours: 0,
  lastResetDay: new Date().toDateString(),
  alerts: [], // { id, level, message, room, timestamp }
};

function getDevices() {
  return state.devices;
}

function getDevice(id) {
  return state.devices.find((d) => d.id === id);
}

function getDevicesByRoom(roomKeyOrName) {
  const key = normalizeRoomKey(roomKeyOrName);
  return state.devices.filter((d) => d.roomKey === key);
}

function normalizeRoomKey(input) {
  if (!input) return null;
  const val = input.toString().trim().toLowerCase().replace(/\s+/g, "");
  if (["drawing", "drawingroom", "dr"].includes(val)) return "drawing";
  if (["work1", "workroom1", "wr1", "room1"].includes(val)) return "work1";
  if (["work2", "workroom2", "wr2", "room2"].includes(val)) return "work2";
  return null;
}

function setDeviceStatus(id, status) {
  const device = getDevice(id);
  if (!device) return null;
  if (device.status !== status) {
    device.status = status;
    device.lastChanged = new Date().toISOString();
  }
  return device;
}

function totalPowerWatts() {
  return state.devices
    .filter((d) => d.status === "on")
    .reduce((sum, d) => sum + d.wattage, 0);
}

function powerByRoom() {
  const result = {};
  for (const room of ROOMS) {
    result[room.name] = state.devices
      .filter((d) => d.roomKey === room.key && d.status === "on")
      .reduce((sum, d) => sum + d.wattage, 0);
  }
  return result;
}

function maybeResetDailyUsage() {
  const today = new Date().toDateString();
  if (today !== state.lastResetDay) {
    state.todayWattHours = 0;
    state.lastResetDay = today;
  }
}

function addWattHours(wh) {
  maybeResetDailyUsage();
  state.todayWattHours += wh;
}

function getTodayKwh() {
  maybeResetDailyUsage();
  return +(state.todayWattHours / 1000).toFixed(2);
}

function addAlert(alert) {
  state.alerts.unshift(alert);
  state.alerts = state.alerts.slice(0, 50); // keep last 50
}

function getAlerts() {
  return state.alerts;
}

module.exports = {
  ROOMS,
  WATTAGE,
  getDevices,
  getDevice,
  getDevicesByRoom,
  normalizeRoomKey,
  setDeviceStatus,
  totalPowerWatts,
  powerByRoom,
  addWattHours,
  getTodayKwh,
  addAlert,
  getAlerts,
};
