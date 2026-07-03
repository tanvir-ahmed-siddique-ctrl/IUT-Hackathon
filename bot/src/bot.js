/**
 * bot.js
 * ---------------------------------------------------------------------------
 * Discord "remote control" for the office. Reads from the SAME backend the
 * web dashboard uses (via REST), so both surfaces always agree.
 *
 * Commands:
 *   !status        -> summary of all 3 rooms
 *   !room <name>   -> status of one room (drawing | work1 | work2)
 *   !usage         -> current total wattage + today's estimated kWh
 *
 * Bonus: polls /api/alerts and proactively posts new alerts to a
 * designated channel (ALERT_CHANNEL_ID).
 * ---------------------------------------------------------------------------
 */

require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const axios = require("axios");
const { humanize } = require("./llm");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const PREFIX = process.env.BOT_PREFIX || "!";
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID || null;
const ALERT_POLL_MS = 30 * 1000;

const api = axios.create({ baseURL: `${BACKEND_URL}/api`, timeout: 5000 });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

let lastSeenAlertId = null;

client.once("ready", () => {
  console.log(`[bot] logged in as ${client.user.tag}`);
  if (ALERT_CHANNEL_ID) {
    setInterval(pollAlerts, ALERT_POLL_MS);
  } else {
    console.log("[bot] ALERT_CHANNEL_ID not set - proactive alerts disabled.");
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [command, ...args] = message.content.slice(PREFIX.length).trim().split(/\s+/);

  try {
    if (command === "status") {
      await handleStatus(message);
    } else if (command === "room") {
      await handleRoom(message, args[0]);
    } else if (command === "usage") {
      await handleUsage(message);
    } else if (command === "help") {
      await message.reply(
        `Here's what I can do:\n\`${PREFIX}status\` - whole-office summary\n\`${PREFIX}room <drawing|work1|work2>\` - one room's status\n\`${PREFIX}usage\` - live power draw + today's kWh`
      );
    }
  } catch (err) {
    console.error(`[bot] error handling "${message.content}":`, err.message);
    await message.reply(
      "I couldn't reach the office backend just now - is the server running? 🔌"
    );
  }
});

async function handleStatus(message) {
  const { data } = await api.get("/devices");
  const rooms = summarizeByRoom(data.devices);
  const reply = await humanize("status", { rooms });
  await message.reply(reply);
}

async function handleRoom(message, roomArg) {
  if (!roomArg) {
    await message.reply(`Usage: \`${PREFIX}room <drawing|work1|work2>\``);
    return;
  }
  const { data, status } = await api
    .get(`/devices/room/${roomArg}`)
    .catch((e) => e.response || { status: 500 });

  if (status === 404) {
    await message.reply(
      `I don't know a room called "${roomArg}". Try \`drawing\`, \`work1\`, or \`work2\`.`
    );
    return;
  }

  const devices = data.devices;
  const fansOn = devices.filter((d) => d.type === "fan" && d.status === "on").length;
  const lightsOn = devices.filter((d) => d.type === "light" && d.status === "on").length;
  const totalWatts = devices
    .filter((d) => d.status === "on")
    .reduce((sum, d) => sum + d.wattage, 0);

  const reply = await humanize("room", {
    room: devices[0]?.room || roomArg,
    fansOn,
    lightsOn,
    totalWatts,
  });
  await message.reply(reply);
}

async function handleUsage(message) {
  const { data } = await api.get("/usage");
  const reply = await humanize("usage", {
    totalWatts: data.totalWatts,
    todayKwh: data.todayKwh,
  });
  await message.reply(reply);
}

function summarizeByRoom(devices) {
  const byRoom = {};
  for (const d of devices) {
    byRoom[d.room] = byRoom[d.room] || { name: d.room, fansOn: 0, lightsOn: 0, onCount: 0 };
    if (d.status === "on") {
      byRoom[d.room].onCount += 1;
      if (d.type === "fan") byRoom[d.room].fansOn += 1;
      if (d.type === "light") byRoom[d.room].lightsOn += 1;
    }
  }
  return Object.values(byRoom);
}

async function pollAlerts() {
  try {
    const { data } = await api.get("/alerts", { params: { limit: 5 } });
    const alerts = data.alerts || [];
    if (!alerts.length) return;

    // alerts are newest-first; find anything newer than the last one we posted
    const newest = alerts[0];
    if (lastSeenAlertId === newest.id) return;

    const freshOnes = [];
    for (const a of alerts) {
      if (a.id === lastSeenAlertId) break;
      freshOnes.push(a);
    }
    lastSeenAlertId = newest.id;

    const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
    for (const alert of freshOnes.reverse()) {
      const reply = await humanize("alert", alert);
      await channel.send(reply);
    }
  } catch (err) {
    console.error("[bot] alert poll failed:", err.message);
  }
}

client.login(process.env.DISCORD_TOKEN);
