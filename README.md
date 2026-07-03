# OfficeQuest

## Setup
1. npm install
2. Copy `backend/.env.example` to `backend/.env` if you want to customize backend settings.
3. Copy `bot/.env.example` to `bot/.env` and fill in `DISCORD_TOKEN` if you want to run the Discord bot.
4. npm run backend   (starts backend on localhost:4000)
5. npm run bot       (optional, starts Discord bot)
6. npm run dashboard (starts the Next.js web dashboard on localhost:3000)

## Backend and bot
- `backend/` and `bot/` come from the `office_project` branch backend implementation.
- The Vite dashboard from `office_project` is intentionally not included in the active app; this branch keeps the Next.js frontend in `app/`.
- The imported backend owns the single source of truth in `backend/src/store.js`.
- It exposes the original `office_project` endpoints (`/api/devices`, `/api/usage`, `/api/alerts`, Socket.IO), plus a compatibility `GET /api/status` endpoint for this Next.js dashboard.

## Frontend dashboard
- The main dashboard is now a **Next.js + React JavaScript** app in `app/page.js`.
- Run it with `npm run dashboard`.
- It polls `http://localhost:4000/api/status` by default, matching the backend and Discord bot data contract.
- You can set `NEXT_PUBLIC_BACKEND_URL=http://localhost:4000` before running the dashboard, or change the backend URL from the floating ⚡ settings modal.
- If the backend is not running yet, the page automatically switches to simulator mode so the layout, lights, fans, power usage, alerts, and timestamps keep changing during demos.
- The backend can be Node, Python, or any other stack. It only needs to expose the API shape below and enable CORS for the dashboard origin.
- `office-dashboard.html` is kept as a legacy static snapshot, but the Next.js app is the frontend to demo and extend.

Expected `/api/status` shape:
```json
{
  "officeHours": true,
  "devices": [
    {
      "id": "drawing-room-fan-1",
      "room": "Drawing Room",
      "type": "fan",
      "label": "Fan 1",
      "watt": 60,
      "on": true,
      "lastChanged": 1783094400000
    }
  ],
  "power": {
    "totalWatt": 180,
    "estimatedKwhToday": 1.4,
    "byRoom": [{ "room": "Drawing Room", "watt": 75 }]
  },
  "alerts": [{ "level": "warn", "message": "Drawing Room is using 75W.", "ts": 1783094400000 }]
}
```

The adapter is intentionally flexible for the backend team:
- device status can be `on: true` or `status: "on"`
- power can be `watt`, `wattage`, `powerDraw`, `power`, or `ratedWatt`
- timestamps can be `lastChanged`, `last_changed`, `updatedAt`, or `updated_at`


  3. Discord bot
Create a Discord application + bot at https://discord.com/developers/applications, enable the Message Content Intent, and invite it to your server with Send Messages + Read Message History permissions.
cd bot
cp .env.example .env      # paste DISCORD_TOKEN, BACKEND_URL, ALERT_CHANNEL_ID
npm install
npm start
In your Discord server:
!status — whole-office summary
!room work1 (or drawing, work2) — one room's status
!usage — live total wattage + today's estimated kWh
!help — command list
If ANTHROPIC_API_KEY is set in bot/.env, replies are rewritten by Claude into a friendly, conversational tone (with the raw facts fixed — the model can't invent numbers, it only rephrases what the backend returned). Without a key, the bot falls back to a clear, still fully data-driven template so it works out of the box.

If ALERT_CHANNEL_ID is set, the bot polls /api/alerts every 30s and proactively posts new anomalies (after-hours devices left on, a room stuck on for 2+ hours) to that channel.

Architecture
One backend, one store (backend/src/store.js): the dashboard and the bot never maintain their own copies of device state — the dashboard subscribes via Socket.IO, the bot polls the same REST endpoints. This is what the assignment calls "share a single backend."
Simulator as a hardware stand-in (backend/src/simulator.js): ticks every 4 seconds, randomly toggles a few devices, accumulates today's watt-hours, and re-evaluates alert conditions. Swapping this file for real ESP32/MQTT ingestion wouldn't require any change to the API, dashboard, or bot — see diagrams/circuit-schematic.md.
Alerts (backend/src/alerts.js): two anomaly types —
any device ON outside 9 AM–5 PM office hours, grouped by room;
a room where every device has been continuously ON for 2+ hours. Alerts are de-duplicated for 15 minutes so the same condition doesn't spam the dashboard/Discord every tick.
Diagrams
System diagram: diagrams/system-diagram.svg (built by hand as SVG, not Mermaid, per the assignment's instructions).
Circuit schematic: diagrams/circuit-schematic.md + the importable Wokwi project in diagrams/wokwi/ — a representative circuit for one room (ESP32 reading/driving 2 fans + 3 lights, plus an ACS712 current-sensor stand-in for real power sensing).
Evaluation checklist (from the brief)
Deliverable	Where
Working web dashboard, real-time	dashboard/ (Socket.IO push, no refresh)
Working Discord bot, real simulated data	bot/ (calls backend REST, no hardcoding)
Dashboard visuals/UX	SVG office floor plan with live glow/spin + panels
System diagram	diagrams/system-diagram.svg
Circuit schematic	diagrams/circuit-schematic.md + diagrams/wokwi/
Simulated data quality	backend/src/simulator.js + store.js (dynamic, timestamped, room-aware)
Codebase structure/docs	this README + inline comments in every module
Video demo
Record a ≤3 minute walkthrough: show the dashboard live-updating, run !status / !room work1 / !usage in Discord, trigger/point out an alert, and briefly narrate the data flow diagram above. Add the video link here once recorded:

Demo video: add link "# Office-monitor"
