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
