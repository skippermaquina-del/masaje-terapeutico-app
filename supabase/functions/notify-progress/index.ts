// Supabase Edge Function: receives a Database Webhook call whenever a row
// in `progress` is inserted/updated, and emails the app owner when that
// change represents a genuinely new topic completion or quiz result.
// Deployed via the dashboard editor (or `supabase functions deploy notify-progress`).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_TO = Deno.env.get("NOTIFY_TO_EMAIL") ?? "skippermaquina@gmail.com";
const FROM_ADDRESS = "MyoMBLEx <onboarding@resend.dev>";

interface ProgressRow {
  user_name: string;
  topic_slug: string;
  completed: boolean;
  quiz_score: number | null;
  quiz_total: number | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: ProgressRow | null;
  old_record: ProgressRow | null;
}

let topicTitleCache: Record<string, string> | null = null;

async function getTopicTitle(slug: string): Promise<string> {
  if (!topicTitleCache) {
    try {
      const res = await fetch("https://skippermaquina-del.github.io/masaje-terapeutico-app/data/topics.json");
      const topics = (await res.json()) as { slug: string; title: string }[];
      topicTitleCache = Object.fromEntries(topics.map((t) => [t.slug, t.title]));
    } catch {
      topicTitleCache = {};
    }
  }
  return topicTitleCache[slug] ?? slug;
}

function isNewCompletion(record: ProgressRow, oldRecord: ProgressRow | null): boolean {
  const wasCompleted = oldRecord?.completed ?? false;
  return record.completed && !wasCompleted;
}

function isNewQuizResult(record: ProgressRow, oldRecord: ProgressRow | null): boolean {
  if (record.quiz_score == null || record.quiz_total == null) return false;
  const scoreChanged = oldRecord?.quiz_score !== record.quiz_score || oldRecord?.quiz_total !== record.quiz_total;
  return scoreChanged;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY secret");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const record = payload.record;
  if (!record || payload.table !== "progress") {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const completion = isNewCompletion(record, payload.old_record);
  const quizResult = isNewQuizResult(record, payload.old_record);

  if (!completion && !quizResult) {
    return new Response(JSON.stringify({ skipped: true, reason: "not a new completion or quiz result" }), {
      status: 200,
    });
  }

  const topicTitle = await getTopicTitle(record.topic_slug);
  const parts: string[] = [];
  if (completion) parts.push(`completó el tema "${topicTitle}"`);
  if (quizResult) parts.push(`hizo el quiz de "${topicTitle}" (${record.quiz_score}/${record.quiz_total})`);
  const summary = `${record.user_name} ${parts.join(" y ")}`;

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [NOTIFY_TO],
        subject: `Nueva actividad: ${record.user_name} en ${topicTitle}`,
        html: `<p>${summary}</p><p style="color:#888;font-size:0.85em">Masaje Terapéutico App — aviso automático</p>`,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend API error:", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 502 });
    }

    return new Response(JSON.stringify({ sent: true, summary }), { status: 200 });
  } catch (err) {
    console.error("notify-progress error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
