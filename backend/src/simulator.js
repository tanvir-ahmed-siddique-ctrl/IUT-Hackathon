/**
 * simulator.js
 * ---------------------------------------------------------------------------
 * Fakes "real" hardware. Every TICK_MS it:
 *   1. Randomly flips a handful of devices on/off (simulating people
 *      arriving, leaving, or forgetting to switch things off).
 *   2. Accumulates today's energy usage (watt-hours) based on what was ON
 *      during that tick.
 *   3. Broadcasts the fresh device list + usage figures to every connected
 *      Socket.IO client (dashboard) so the UI updates with no refresh.
 *   4. Hands off to alerts.js to recompute anomalies and push any new ones.
 * ---------------------------------------------------------------------------
 */

const store = require("./store");
const { evaluateAlerts } = require("./alerts");

const TICK_MS = 4000; // simulated sensor poll interval
const TOGGLE_PROBABILITY = 0.12; // chance any single device flips per tick

function tick(io) {
  const devices = store.getDevices();

  // 1. Randomly toggle a few devices
  for (const device of devices) {
    if (Math.random() < TOGGLE_PROBABILITY) {
      const newStatus = device.status === "on" ? "off" : "on";
      store.setDeviceStatus(device.id, newStatus);
      io.emit("device:changed", store.getDevice(device.id));
    }
  }

  // 2. Accumulate energy usage for this tick
  const wattsNow = store.totalPowerWatts();
  const hoursThisTick = TICK_MS / 1000 / 60 / 60;
  store.addWattHours(wattsNow * hoursThisTick);

  // 3. Broadcast full snapshot
  const snapshot = buildSnapshot();
  io.emit("devices:update", snapshot);

  // 4. Evaluate alert conditions, broadcast + let caller (server.js) know
  //    about newly created alerts so the Discord bot polling endpoint and
  //    any push-to-Discord hook can react.
  const newAlerts = evaluateAlerts(devices);
  if (newAlerts.length) {
    io.emit("alerts:new", newAlerts);
  }
}

function buildSnapshot() {
  return {
    devices: store.getDevices(),
    totalWatts: store.totalPowerWatts(),
    byRoom: store.powerByRoom(),
    todayKwh: store.getTodayKwh(),
    timestamp: new Date().toISOString(),
  };
}

function start(io) {
  // fire one immediately so the very first API/socket calls have data
  tick(io);
  return setInterval(() => tick(io), TICK_MS);
}

module.exports = { start, buildSnapshot };
