# OfficeQuest

## Setup
1. npm install
2. Copy _env.example to .env and fill in DISCORD_TOKEN
3. npm run backend   (starts backend on localhost:4000)
4. npm run bot       (optional, starts Discord bot)
5. Open office-dashboard.html in your browser

## Frontend dashboard
- `office-dashboard.html` is a self-contained premium demo dashboard: no build step needed.
- It polls `http://localhost:4000/api/status` by default, matching the backend and Discord bot data contract.
- If the backend is not running yet, the page automatically switches to simulator mode so the layout, lights, fans, power usage, alerts, and timestamps keep changing during demos.
- The backend URL can be changed directly from the dashboard input and is saved in local storage.

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
