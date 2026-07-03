/**
 * alerts.js
 * ---------------------------------------------------------------------------
 * Looks at the current device state and raises anomalies:
 *
 *  1. AFTER-HOURS: any device still ON outside 9:00-17:00.
 *  2. ROOM-STUCK-ON: a room where every device has been continuously ON
 *     for more than 2 hours.
 *
 * Alerts are de-duplicated (by a stable key) so we don't spam the same
 * warning every 4-second tick - a given condition only re-fires once it
 * clears and re-triggers, or once per rolling window.
 * ---------------------------------------------------------------------------
 */

const store = require("./store");

const OFFICE_OPEN_HOUR = 9; // 9 AM
const OFFICE_CLOSE_HOUR = 17; // 5 PM
const STUCK_ON_MS = 2 * 60 * 60 * 1000; // 2 hours
const DEDUP_WINDOW_MS = 15 * 60 * 1000; // don't repeat same alert within 15 min

function isAfterHours(date = new Date()) {
  const hour = date.getHours();
  return hour < OFFICE_OPEN_HOUR || hour >= OFFICE_CLOSE_HOUR;
}

function recentlyAlerted(key) {
  const existing = store.getAlerts().find((a) => a.key === key);
  if (!existing) return false;
  return Date.now() - new Date(existing.timestamp).getTime() < DEDUP_WINDOW_MS;
}

function evaluateAlerts(devices) {
  const created = [];
  const now = new Date();

  // --- 1. After-hours devices left on ------------------------------------
  if (isAfterHours(now)) {
    const onDevices = devices.filter((d) => d.status === "on");
    // group by room so we raise one alert per room, not one per device
    const byRoom = {};
    for (const d of onDevices) {
      byRoom[d.room] = byRoom[d.room] || [];
      byRoom[d.room].push(d);
    }
    for (const [room, list] of Object.entries(byRoom)) {
      const key = `after-hours:${room}`;
      if (recentlyAlerted(key)) continue;
      const fans = list.filter((d) => d.type === "fan").length;
      const lights = list.filter((d) => d.type === "light").length;
      const alert = {
        id: `${key}:${Date.now()}`,
        key,
        level: "warning",
        room,
        message: `${room} still has ${fans} fan${fans !== 1 ? "s" : ""} and ${lights} light${
          lights !== 1 ? "s" : ""
        } ON after office hours (${formatTime(now)}). Did someone forget to switch off?`,
        timestamp: now.toISOString(),
      };
      store.addAlert(alert);
      created.push(alert);
    }
  }

  // --- 2. Room where everything has been on for 2+ hours straight --------
  for (const room of store.ROOMS) {
    const roomDevices = devices.filter((d) => d.roomKey === room.key);
    const allOn = roomDevices.every((d) => d.status === "on");
    if (!allOn) continue;
    const oldestChange = Math.max(
      ...roomDevices.map((d) => new Date(d.lastChanged).getTime())
    );
    // "continuously on for 2h" approximated as: every device's last state
    // change happened more than 2 hours ago (i.e. nothing has flickered).
    const allStableForTwoHours = roomDevices.every(
      (d) => now.getTime() - new Date(d.lastChanged).getTime() >= STUCK_ON_MS
    );
    if (!allStableForTwoHours) continue;

    const key = `stuck-on:${room.name}`;
    if (recentlyAlerted(key)) continue;
    const alert = {
      id: `${key}:${Date.now()}`,
      key,
      level: "critical",
      room: room.name,
      message: `${room.name} has had every device running continuously for over 2 hours (since ${formatTime(
        new Date(oldestChange)
      )}). Worth checking on.`,
      timestamp: now.toISOString(),
    };
    store.addAlert(alert);
    created.push(alert);
  }

  return created;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

module.exports = { evaluateAlerts, isAfterHours };
