/**
 * llm.js
 * ---------------------------------------------------------------------------
 * Turns raw JSON facts (never hardcoded/random text) into a friendly reply.
 * If ANTHROPIC_API_KEY is set, we ask Claude to phrase the given facts
 * conversationally. If it's not set (or the call fails), we fall back to a
 * simple, still-dynamic template so the bot works out of the box.
 *
 * IMPORTANT: the LLM is only ever given facts we already computed from the
 * live store (via the backend API) - it is not allowed to invent numbers.
 * ---------------------------------------------------------------------------
 */

const hasKey = !!process.env.ANTHROPIC_API_KEY;
let Anthropic = null;
let client = null;

if (hasKey) {
  Anthropic = require("@anthropic-ai/sdk");
  client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPT = `You are the office's friendly building-management assistant, speaking inside Discord.
You will be given ONLY factual JSON about the current state of office devices/power.
Rewrite those facts as a short, warm, conversational Discord message (2-4 sentences, may use 1-2 emoji).
Never invent numbers, device names, or facts that are not present in the JSON. Do not add a greeting like "Hello" -
just answer naturally, like a helpful coworker giving a quick update.`;

async function humanize(kind, facts) {
  if (!hasKey) {
    return templateFallback(kind, facts);
  }
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Message type: ${kind}\nFacts (JSON):\n${JSON.stringify(facts, null, 2)}\n\nWrite the Discord reply now.`,
        },
      ],
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    return text || templateFallback(kind, facts);
  } catch (err) {
    console.error("[llm] Anthropic call failed, falling back to template:", err.message);
    return templateFallback(kind, facts);
  }
}

// Deterministic, still fully data-driven fallback used when no API key is present.
function templateFallback(kind, facts) {
  if (kind === "status") {
    const lines = facts.rooms.map((r) => {
      if (r.onCount === 0) return `**${r.name}**: all off.`;
      return `**${r.name}**: ${r.fansOn} fan${r.fansOn !== 1 ? "s" : ""} ON, ${r.lightsOn} light${
        r.lightsOn !== 1 ? "s" : ""
      } ON.`;
    });
    return `Here's the current office snapshot:\n${lines.join("\n")}`;
  }
  if (kind === "room") {
    const { room, fansOn, lightsOn, totalWatts } = facts;
    if (fansOn === 0 && lightsOn === 0) {
      return `${room} is all quiet right now - everything's switched off. 👍`;
    }
    return `${room} currently has ${fansOn} fan${fansOn !== 1 ? "s" : ""} and ${lightsOn} light${
      lightsOn !== 1 ? "s" : ""
    } running, drawing about ${totalWatts}W.`;
  }
  if (kind === "usage") {
    return `Total power right now: ${facts.totalWatts}W. Today's estimated usage so far: ${facts.todayKwh} kWh.`;
  }
  if (kind === "alert") {
    return `⚠️ Heads up - ${facts.message}`;
  }
  return "Here's the latest office data.";
}

module.exports = { humanize };
