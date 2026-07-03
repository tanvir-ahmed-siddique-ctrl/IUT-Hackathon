# OfficeQuest

## Setup
1. npm install
2. Copy _env.example to .env and fill in DISCORD_TOKEN
3. npm run backend   (starts backend on localhost:4000)
4. npm run bot       (optional, starts Discord bot)
5. npm run dashboard (starts the Next.js web dashboard on localhost:3000)

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
- power can be `watt`, `powerDraw`, `power`, or `ratedWatt`
- timestamps can be `lastChanged`, `last_changed`, `updatedAt`, or `updated_at`
