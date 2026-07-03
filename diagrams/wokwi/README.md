# Wokwi Simulation Files

This folder contains a ready-to-import Wokwi project for **Work Room 1**
(2 fans + 3 lights + a current-sensor stand-in on an ESP32), used as the
representative hardware circuit required by the assignment.

## How to run it

1. Go to https://wokwi.com/projects/new/esp32
2. Open the project's file explorer (left sidebar) and replace the contents
   of `diagram.json` with the file in this folder.
3. Replace `sketch.ino` with `main.ino` from this folder.
4. Press ▶️ Play. You'll see:
   - 3 yellow LEDs representing Light 1–3 (2 start ON, matching the default
     simulated state).
   - 2 cyan LEDs representing Fan 1–2.
   - Serial Monitor output every 4 seconds with a JSON line showing sensed
     current draw — the same shape of data the Node.js backend produces.

## Why LEDs instead of real relays/motors in the simulator

Wokwi runs entirely in the browser and can't simulate mains-voltage AC loads
or physical relay clicks. The LEDs are a safe, visual stand-in for "this
circuit is energized." `diagrams/circuit-schematic.md` describes the real
relay-module wiring you'd use to actually switch mains-voltage lights/fans
in a physical build — the GPIO pin assignments are identical.

## Publishing to Wokwi with one click

Once this repository is pushed to GitHub, you can open it directly in Wokwi
via:

```
https://wokwi.com/projects/new/esp32?importFrom=<your-github-repo-url>/tree/main/diagrams/wokwi
```

(Replace `<your-github-repo-url>` with your actual repo URL after pushing.)
