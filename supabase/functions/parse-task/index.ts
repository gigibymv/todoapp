import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, timezone } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const tz = timezone || "America/New_York";
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: tz });
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const currentTime = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz });

    const systemPrompt = `You are a task parser. Today is ${dayOfWeek}, ${today}. The current time is ${currentTime} (timezone: ${tz}).

CRITICAL RULES:
- ALWAYS extract a due_date. If the user says "tomorrow", "next week", "Monday", "this afternoon", etc., convert to an ISO 8601 datetime.
- If no time info is given at all, default to end of today (${today}T23:59:00).
- "tomorrow afternoon" = tomorrow at 14:00. "tonight" = today at 20:00. "next Monday" = next Monday at 09:00.
- All dates/times should be relative to the user's timezone (${tz}), but output as ISO 8601 with proper UTC offset.
- NEVER put date/time information in the title. The title should be the clean action only.
- If the user mentions a location or place (e.g. "at Starbucks", "in the office", "at 123 Main St", "chez le dentiste"), extract it into the "location" field and remove it from the title.
- Available contexts: work, mba, personal, finance, health, legal.
- Return ONLY valid JSON matching the schema, no markdown, no explanation.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("No content in Gemini response");

    const parsed = JSON.parse(raw);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-task error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
