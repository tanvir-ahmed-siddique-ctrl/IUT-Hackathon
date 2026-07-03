const hasKey = !!process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

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
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 300,
        temperature: 0.6,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Message type: ${kind}\nFacts (JSON):\n${JSON.stringify(facts, null, 2)}\n\nWrite the Discord reply now.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq API responded ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || templateFallback(kind, facts);
  } catch (err) {
    console.error("[llm] Groq call failed, falling back to template:", err.message);
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
