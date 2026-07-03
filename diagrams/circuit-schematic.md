# Hardware / Electrical Schematic — Work Room 1 (representative circuit)

This is a **concept/simulation only** — no physical hardware is required for the
project deliverable. It shows how the 5 devices in one room (2 fans + 3 lights)
would realistically be wired to, and sensed by, a microcontroller. The same
pattern repeats for the other two rooms (a real deployment would either use 3
ESP32s, one per room, or one ESP32 with a GPIO/relay expander — see "Scaling to
all 3 rooms" below).

## How to open/build this in Wokwi

1. Go to https://wokwi.com/projects/new/esp32 to start a new ESP32 project.
2. Delete the default `diagram.json` contents and rebuild using the parts list
   below (search each part by name in Wokwi's part picker).
3. Paste `firmware/main.ino` (included in this folder) into `sketch.ino`.
4. Click the green "Play" button — the LEDs simulate the lights, the DC motors
   (or a second LED pair) simulate the fans, and the Serial Monitor prints the
   sensed current draw, exactly like the values our backend simulator fakes.

## Parts list (per room)

| Qty | Part                                   | Purpose                                                 |
|-----|-----------------------------------------|----------------------------------------------------------|
| 1   | ESP32 DevKit V1                         | Microcontroller — reads switch state, drives relays, publishes readings over Wi-Fi/MQTT |
| 3   | 5V single-channel relay module          | Switches each **light** circuit (AC mains) on/off from a 3.3V GPIO |
| 2   | 5V single-channel relay module          | Switches each **fan** circuit on/off from a 3.3V GPIO |
| 1   | ACS712 (5A) current sensor module       | Measures real-time current draw of the room's live wire → lets us compute actual Watts instead of assuming a fixed wattage |
| 5   | LEDs (in the Wokwi sim only)            | Stand in visually for the 3 lights + 2 fans so the simulation is watchable without real AC loads |
| 5   | 220Ω resistors                          | Current-limiting for the simulation LEDs |
| 1   | Breadboard + jumper wires               | Prototyping |
| 1   | 5V/2A power supply (or USB)             | Powers the ESP32 + relay coils |

> ⚠️ **Real-world safety note:** the lights/fans themselves run on mains AC.
> The relay modules isolate the ESP32's low-voltage logic from the mains side
> via an opto-isolator on the relay board. In an actual install, all
> mains-side wiring (relay COM/NO terminals to the light/fan circuit) must be
> done by a qualified electrician inside a proper enclosure — the
> microcontroller side only ever touches 3.3V/5V DC.

## Wiring table (ESP32 GPIO map for one room)

| Device        | Function        | ESP32 Pin | Notes                                  |
|---------------|------------------|-----------|-----------------------------------------|
| Light 1       | Relay IN         | GPIO 16   | Drives relay coil (active LOW typical)  |
| Light 2       | Relay IN         | GPIO 17   |                                          |
| Light 3       | Relay IN         | GPIO 18   |                                          |
| Fan 1         | Relay IN         | GPIO 19   |                                          |
| Fan 2         | Relay IN         | GPIO 21   |                                          |
| ACS712        | Analog OUT       | GPIO 34 (ADC1_CH6) | Reads instantaneous current draw for the whole room |
| Status LED    | Onboard          | GPIO 2    | Blinks to show Wi-Fi/MQTT heartbeat     |
| (optional) Push-buttons | Digital IN | GPIO 25–27 | Manual local override switches per device, mirrored back to the backend |

## Data flow from this board to the backend

```
[ESP32 reads relay/GPIO state + ACS712 current] 
        │  (Wi-Fi, e.g. HTTP POST or MQTT publish every few seconds)
        ▼
[Backend /api/devices/:id  or MQTT bridge] 
        │
        ▼
[store.js updates device.status / wattage / lastChanged]
        │
        ▼
[Socket.IO broadcast → Dashboard]   +   [REST → Discord bot]
```

In this project's **software deliverable**, `backend/src/simulator.js` plays
the role of "ESP32 readings arriving over the network" — it's a drop-in
replacement so the rest of the system (API, dashboard, bot) doesn't need to
change at all when real hardware is introduced later. Swapping the simulator
for real ESP32 firmware only touches one file.

## Scaling to all 3 rooms

Two realistic options, both compatible with the backend's `roomKey` field:

- **Option A — one ESP32 per room (recommended):** each board owns its 5
  local devices and reports to the backend with its `roomKey` in the payload
  (`{"roomKey":"work1","deviceId":"work1-fan-1","status":"on"}`). Simple,
  fault-isolated (one room's Wi-Fi hiccup doesn't affect the others).
- **Option B — one ESP32 + I/O expander (e.g. MCP23017) for all 18 GPIOs:**
  cheaper hardware-wise, but a single point of failure for the whole office.

## Wokwi diagram source

A ready-to-import `diagram.json` + `sketch.ino` pair is provided in
`diagrams/wokwi/` in this repo — open `diagrams/wokwi/README.md` for the
one-click Wokwi project link once you've pushed this repo to GitHub (Wokwi
can import directly from a public repo URL).
