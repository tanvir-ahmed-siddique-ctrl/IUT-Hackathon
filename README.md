# Office Pulse — Lights, Fans, Discord: The Boss's Big Idea

A live monitoring system for a 3-room office (Drawing Room, Work Room 1, Work
Room 2 — 15 simulated devices total) with a real-time web dashboard and a
Discord bot, both backed by one shared Node.js backend.

```
[Simulated Device Layer] → [Backend API + Socket.IO] → [Web Dashboard] && [Discord Bot] → User
```

## Repo layout

```
office-monitor/
├── backend/          Express + Socket.IO API, in-memory store, device simulator, alert engine
├── bot/               discord.js bot (!status, !room, !usage) + Claude-powered humanized replies
├── dashboard/         React + Vite + Tailwind live dashboard (SVG office floor plan, panels)
├── diagrams/
│   ├── system-diagram.svg       high-level architecture diagram
│   ├── circuit-schematic.md     hardware/electrical design writeup
│   └── wokwi/                   importable Wokwi ESP32 simulation (diagram.json + main.ino)
└── README.md          (this file)
```

## A note on device count

The brief states "2 fans and 3 lights per room → 15 devices total" but later
also refers to "18 devices" in a few places. Since the explicit per-room
breakdown (2 fans + 3 lights) and the reference office floor-plan image both
match **5 devices/room × 3 rooms = 15**, this project implements 15 devices.
Everything is driven from `backend/src/store.js`, so adjusting the count (e.g.
to add a 3rd fan per room) is a one-line change if 18 was intended instead.

## Quick start

You'll need Node.js 18+ and a Discord bot token (only required for the bot).

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # http://localhost:4000
```

This starts the Express API, Socket.IO server, and the device simulator (which
starts ticking immediately — random devices flip on/off every ~4s, exactly
like the real thing would).

Try it: `curl http://localhost:4000/api/usage`

### 2. Web dashboard

```bash
cd dashboard
cp .env.example .env     # points VITE_BACKEND_URL at the backend above
npm install
npm run dev               # http://localhost:5173
```

Open the URL — you'll see the office floor plan glow/animate live, the device
panel, the power meter, and the alerts panel, all updating with no page
refresh (pushed over Socket.IO).

### 3. Discord bot

1. Create a Discord application + bot at https://discord.com/developers/applications,
   enable the **Message Content Intent**, and invite it to your server with
   `Send Messages` + `Read Message History` permissions.
2. ```bash
   cd bot
   cp .env.example .env      # paste DISCORD_TOKEN, BACKEND_URL, ALERT_CHANNEL_ID
   npm install
   npm start
   ```
3. In your Discord server:
   - `!status` — whole-office summary
   - `!room work1` (or `drawing`, `work2`) — one room's status
   - `!usage` — live total wattage + today's estimated kWh
   - `!help` — command list

If `ANTHROPIC_API_KEY` is set in `bot/.env`, replies are rewritten by Claude
into a friendly, conversational tone (with the raw facts fixed — the model
can't invent numbers, it only rephrases what the backend returned). Without a
key, the bot falls back to a clear, still fully data-driven template so it
works out of the box.

If `ALERT_CHANNEL_ID` is set, the bot polls `/api/alerts` every 30s and
proactively posts new anomalies (after-hours devices left on, a room stuck on
for 2+ hours) to that channel.

## Architecture

- **One backend, one store** (`backend/src/store.js`): the dashboard and the
  bot never maintain their own copies of device state — the dashboard
  subscribes via Socket.IO, the bot polls the same REST endpoints. This is
  what the assignment calls "share a single backend."
- **Simulator as a hardware stand-in** (`backend/src/simulator.js`): ticks
  every 4 seconds, randomly toggles a few devices, accumulates today's
  watt-hours, and re-evaluates alert conditions. Swapping this file for real
  ESP32/MQTT ingestion wouldn't require any change to the API, dashboard, or
  bot — see `diagrams/circuit-schematic.md`.
- **Alerts** (`backend/src/alerts.js`): two anomaly types —
  1. any device ON outside 9 AM–5 PM office hours, grouped by room;
  2. a room where every device has been continuously ON for 2+ hours.
  Alerts are de-duplicated for 15 minutes so the same condition doesn't spam
  the dashboard/Discord every tick.

## Diagrams

- **System diagram**: `diagrams/system-diagram.svg` (built by hand as SVG,
  not Mermaid, per the assignment's instructions).
- **Circuit schematic**: `diagrams/circuit-schematic.md` + the importable
  Wokwi project in `diagrams/wokwi/` — a representative circuit for one room
  (ESP32 reading/driving 2 fans + 3 lights, plus an ACS712 current-sensor
  stand-in for real power sensing).

## Evaluation checklist (from the brief)

| Deliverable | Where |
|---|---|
| Working web dashboard, real-time | `dashboard/` (Socket.IO push, no refresh) |
| Working Discord bot, real simulated data | `bot/` (calls backend REST, no hardcoding) |
| Dashboard visuals/UX | SVG office floor plan with live glow/spin + panels |
| System diagram | `diagrams/system-diagram.svg` |
| Circuit schematic | `diagrams/circuit-schematic.md` + `diagrams/wokwi/` |
| Simulated data quality | `backend/src/simulator.js` + `store.js` (dynamic, timestamped, room-aware) |
| Codebase structure/docs | this README + inline comments in every module |

## Video demo

Record a ≤3 minute walkthrough: show the dashboard live-updating, run
`!status` / `!room work1` / `!usage` in Discord, trigger/point out an alert,
and briefly narrate the data flow diagram above. Add the video link here
once recorded:

> Demo video: _add link_
"# Office-monitor" 
