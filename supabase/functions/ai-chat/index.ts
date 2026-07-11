// Supabase Edge Function: proxies chat messages to the Anthropic API so the
// API key never has to live in the public frontend bundle. Deployed with
// `supabase functions deploy ai-chat`.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 1024;

const ALLOWED_ORIGINS = new Set([
  "https://skippermaquina-del.github.io",
  "http://localhost:5173",
  "http://localhost:5175",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://skippermaquina-del.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  topicTitle: string;
  notesContext: string;
  messages: ChatMessage[];
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured: missing ANTHROPIC_API_KEY" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const { topicTitle, notesContext, messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
  // cap history length so a runaway client can't blow up token usage/cost
  const trimmedMessages = messages.slice(-20);

  const systemPrompt = `You are a study assistant inside a massage therapy exam-prep app, helping a student prepare for the MBLEx (Massage & Bodywork Licensing Examination). The student is currently studying the topic "${topicTitle}". Answer their questions clearly and accurately, grounded in the topic notes below when relevant. Keep answers focused and exam-relevant — this is a study tool, not a general chatbot. If a question is outside massage therapy/anatomy/kinesiology/exam-prep scope, gently redirect back to the topic.

Topic notes:
${notesContext}`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: trimmedMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: "Upstream AI request failed" }), {
        status: 502,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-chat function error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
