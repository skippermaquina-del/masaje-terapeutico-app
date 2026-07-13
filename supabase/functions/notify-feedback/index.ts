// Supabase Edge Function: receives a Database Webhook call whenever a row
// is inserted into `feedback`, and emails the app owner the submission.
// Deployed via the dashboard editor (or `supabase functions deploy notify-feedback`).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_TO = Deno.env.get("NOTIFY_TO_EMAIL") ?? "skippermaquina@gmail.com";
const FROM_ADDRESS = "MyoMBLEx <onboarding@resend.dev>";

interface FeedbackRow {
  user_name: string | null;
  message: string;
  page_context: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: FeedbackRow | null;
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
  if (!record || payload.table !== "feedback" || payload.type !== "INSERT") {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  const who = record.user_name?.trim() || "Anonymous";
  const where = record.page_context || "unknown page";

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
        subject: `New feedback from ${who}`,
        html: `
          <p><strong>${who}</strong> (from <code>${where}</code>) wrote:</p>
          <blockquote style="border-left:3px solid #ccc;margin:0;padding-left:1em;white-space:pre-wrap">${record.message}</blockquote>
          <p style="color:#888;font-size:0.85em">Masaje Terapéutico App — aviso automático</p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend API error:", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 502 });
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 });
  } catch (err) {
    console.error("notify-feedback error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
