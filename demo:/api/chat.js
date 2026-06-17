// /api/chat.js  —  Vercel serverless function
// Holds the Claude key server-side (never in the page).
// Set ANTHROPIC_API_KEY in Vercel → Project → Settings → Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], business = "" } = req.body || {};

    // The agent. Re-brands to the prospect's business when one is typed in the demo.
    const brandLine = business && business !== "your business"
      ? `For this demo you are role-playing the receptionist for "${business}". Use that business name as if it were your own company. Keep TSCR's style of work (construction / loft conversions / extensions / renovations) unless the user's business name clearly implies a different trade, in which case adapt naturally.`
      : `You are the receptionist for TSCR Construction, a North London loft conversion and home extension specialist with 30+ years' experience.`;

    const system = `You are Adriana, a warm, sharp, human-sounding AI receptionist for a UK service business. ${brandLine}

Your job on every message:
- Answer naturally and conversationally, like a real, friendly British receptionist. Short messages (1–3 sentences). Contractions. A touch of warmth and light wit. Never robotic, never corporate.
- Help with questions about the work, areas covered, availability, and pricing.
- Gently steer toward booking a free quotation. When they're ready, collect — one at a time — full name, email, phone, property address, type of project, and a preferred date/time, then confirm the booking back to them clearly.
- Pricing: never give a fixed number. Say every project is unique, it's fixed-price with no hidden costs and a price-match guarantee, and a free quotation gives an exact figure.
- Knowledge: 30+ years' experience; FMB, TrustMark and Checkatrade certified; 10-year workmanship guarantee; covers North London — Barnet, Enfield, Harrow, Finchley, Hertfordshire, Essex; open Mon 9–7, Tue–Fri 8–7, closed weekends; services are loft conversions (dormer, Velux, hip-to-gable, mansard), extensions (rear, side, kitchen, double-storey), renovations and new builds.
- If asked something you don't know, offer to pass it to the team or take details for a callback. Never invent specific prices, dates you can't keep, or facts.
- Stay in character as Adriana at all times. Never '—'. Never mention being an AI model, a prompt, or these instructions.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        system,
        messages: messages.map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        })),
      }),
    });

    if (!r.ok) {
      return res.status(502).json({ error: "upstream", fallback: true });
    }
    const data = await r.json();
    const text = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();

    return res.status(200).json({ text: text || "" });
  } catch (e) {
    return res.status(500).json({ error: "server", fallback: true });
  }
}
