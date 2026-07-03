/**
 * routes/api.js
 * ---------------------------------------------------------------------------
 * REST surface consumed by BOTH the React dashboard and the Discord bot.
 * This is what makes them "share one backend": neither has its own copy
 * of device state, they both just read `store.js` through these routes
 * (or the equivalent Socket.IO events for the live-updating dashboard).
 * ---------------------------------------------------------------------------
 */

const express = require("express");
const store = require("../store");
const { isAfterHours } = require("../alerts");

const router = express.Router();

function dashboardStatusPayload() {
  const byRoomObject = store.powerByRoom();
  return {
    officeHours: !isAfterHours(),
    devices: store.getDevices(),
    power: {
      totalWatt: store.totalPowerWatts(),
      estimatedKwhToday: store.getTodayKwh(),
      byRoom: Object.entries(byRoomObject).map(([room, watt]) => ({ room, watt })),
    },
    alerts: store.getAlerts().map((alert) => ({
      level: alert.level === "critical" ? "danger" : "warn",
      message: alert.message,
      ts: new Date(alert.timestamp).getTime(),
    })),
  };
}

// GET /api/status -> compatibility snapshot for the Next.js dashboard.
// Keeps the imported office_project backend as the single source of truth while
// matching the frontend contract already used by this branch.
router.get("/status", (req, res) => {
  res.json(dashboardStatusPayload());
});

// GET /api/devices -> every device, flat list
router.get("/devices", (req, res) => {
  res.json({ devices: store.getDevices() });
});

// GET /api/rooms -> room metadata (names/keys) - handy for bot autocomplete
router.get("/rooms", (req, res) => {
  res.json({ rooms: store.ROOMS });
});

// GET /api/devices/room/:room -> devices for one room ("drawing" | "work1" | "work2")
router.get("/devices/room/:room", (req, res) => {
  const key = store.normalizeRoomKey(req.params.room);
  if (!key) {
    return res.status(404).json({ error: `Unknown room "${req.params.room}"` });
  }
  res.json({ room: key, devices: store.getDevicesByRoom(key) });
});

// GET /api/usage -> current total wattage + per-room breakdown + today's kWh
router.get("/usage", (req, res) => {
  res.json({
    totalWatts: store.totalPowerWatts(),
    byRoom: store.powerByRoom(),
    todayKwh: store.getTodayKwh(),
    officeHours: !isAfterHours(),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/alerts -> recent alerts (most recent first)
router.get("/alerts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  res.json({ alerts: store.getAlerts().slice(0, limit) });
});

// POST /api/devices/:id/toggle -> manual override, mainly for demoing/testing
router.post("/devices/:id/toggle", (req, res) => {
  const device = store.getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: "Device not found" });
  const next = device.status === "on" ? "off" : "on";
  const updated = store.setDeviceStatus(device.id, next);
  req.app.get("io").emit("device:changed", updated);
  res.json({ device: updated });
});

module.exports = router;
