/*
 * main.ino — Work Room 1 representative firmware (Wokwi simulation)
 * ---------------------------------------------------------------------------
 * Reads simulated "commanded" states for 3 lights + 2 fans (in real life
 * these would come from relay feedback / physical switches / an MQTT
 * command topic), drives the indicator LEDs, and periodically samples the
 * ACS712 current-sensor stand-in to estimate power draw — the same shape of
 * data our Node.js `simulator.js` produces for the rest of the system.
 *
 * In a real deployment this sketch would additionally POST readings to the
 * backend, e.g.:
 *   POST http://<backend-host>:4000/api/devices/work1-light-1/toggle
 * or publish to MQTT, which a small bridge service forwards into store.js.
 * ---------------------------------------------------------------------------
 */

const int LIGHT_PINS[3] = {16, 17, 18};
const int FAN_PINS[2] = {19, 21};
const int CURRENT_SENSOR_PIN = 34;

bool lightState[3] = {true, false, true};
bool fanState[2] = {true, false};

unsigned long lastSampleMs = 0;
const unsigned long SAMPLE_INTERVAL_MS = 4000; // matches backend TICK_MS

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 3; i++) {
    pinMode(LIGHT_PINS[i], OUTPUT);
    digitalWrite(LIGHT_PINS[i], lightState[i] ? HIGH : LOW);
  }
  for (int i = 0; i < 2; i++) {
    pinMode(FAN_PINS[i], OUTPUT);
    digitalWrite(FAN_PINS[i], fanState[i] ? HIGH : LOW);
  }
  pinMode(CURRENT_SENSOR_PIN, INPUT);
  Serial.println("Work Room 1 controller online.");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    lastSampleMs = now;
    sampleAndReport();
  }
}

void sampleAndReport() {
  // ACS712 stand-in gives a raw ADC value; a real ACS712 5A module outputs
  // ~185mV per Amp around a 2.5V midpoint. We convert accordingly.
  int raw = analogRead(CURRENT_SENSOR_PIN); // 0-4095 on ESP32
  float voltage = (raw / 4095.0) * 3.3;
  float amps = (voltage - 1.65) / 0.185; // centered stand-in conversion
  float estimatedWatts = abs(amps) * 230.0; // assuming 230V mains

  int lightsOn = 0, fansOn = 0;
  for (int i = 0; i < 3; i++) if (lightState[i]) lightsOn++;
  for (int i = 0; i < 2; i++) if (fanState[i]) fansOn++;

  Serial.print("{\"room\":\"work1\",\"lightsOn\":");
  Serial.print(lightsOn);
  Serial.print(",\"fansOn\":");
  Serial.print(fansOn);
  Serial.print(",\"sensedWatts\":");
  Serial.print(estimatedWatts, 1);
  Serial.println("}");

  // This is where a real board would fire an HTTP POST / MQTT publish
  // to the backend so store.js can update `wattage` with a *measured*
  // value instead of the fixed per-device constant the software
  // simulator uses.
}
