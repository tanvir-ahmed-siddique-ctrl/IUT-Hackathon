/**
 * server.js
 * ---------------------------------------------------------------------------
 * Entry point. Wires together:
 *   Express (REST API)  +  Socket.IO (live push)  +  simulator (fake devices)
 *
 * [Simulated Device Layer] -> [Backend API/Socket.IO] -> [Web UI] & [Discord Bot]
 * ---------------------------------------------------------------------------
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const apiRoutes = require("./routes/api");
const simulator = require("./simulator");

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN },
});

// make io reachable from route handlers (e.g. manual toggle route)
app.set("io", io);

app.use("/api", apiRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  console.log(`[socket] client connected: ${socket.id}`);
  // send an immediate snapshot so the dashboard doesn't wait for the next tick
  socket.emit("devices:update", simulator.buildSnapshot());

  socket.on("disconnect", () => {
    console.log(`[socket] client disconnected: ${socket.id}`);
  });
});

simulator.start(io);

server.listen(PORT, () => {
  console.log(`Office monitor backend listening on http://localhost:${PORT}`);
});
