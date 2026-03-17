import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, timezone } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const tz = timezone || "America/New_York";
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: tz });
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const currentTime = now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: tz });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a task parser. Today is ${dayOfWeek}, ${today}. The current time is ${currentTime} (timezone: ${tz}).

CRITICAL RULES:
- ALWAYS extract a due_date. If the user says "tomorrow", "next week", "Monday", "this afternoon", etc., convert to an ISO 8601 datetime.
- If no time info is given at all, default to end of today (${today}T23:59:00).
- "tomorrow afternoon" = tomorrow at 14:00. "tonight" = today at 20:00. "next Monday" = next Monday at 09:00.
- All dates/times should be relative to the user's timezone (${tz}), but output as ISO 8601 with proper UTC offset.
- NEVER put date/time information in the title. The title should be the clean action only.
- If the user mentions a location or place (e.g. "at Starbucks", "in the office", "at 123 Main St", "chez le dentiste"), extract it into the "location" field and remove it from the title.
- Available contexts: work, mba, personal, finance, health, legal.
- Return ONLY the function call.`,
          },
          { role: "user", content: text },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_task",
              description: "Parse a natural language task into structured metadata",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Clean task title" },
                  context: { type: "string", enum: ["work", "mba", "personal", "finance", "health", "legal"] },
                  priority: { type: "string", enum: ["p1", "p2", "p3", "p4"] },
                  energy_type: { type: "string", enum: ["deep_work", "shallow", "admin", "quick_win"] },
                  due_date: { type: "string", description: "ISO 8601 datetime or null" },
                  estimated_duration_min: { type: "number", description: "Estimated minutes" },
                  recurrence_rule: { type: "string", description: "RRULE string or null" },
                  tags: { type: "array", items: { type: "string" } },
                  project_name: { type: "string", description: "Suggested project name or null" },
                  location: { type: "string", description: "Location or place mentioned by the user, or null" },
                },
                required: ["title", "context", "priority", "energy_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_task" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);

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
