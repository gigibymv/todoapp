import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are my operational Chief of Staff. You produce a CEO-grade daily briefing — not prose, not summaries.

RULES:
- must_do: 2-4 items max. Only what truly moves the needle.
- skip: Items that are noise, low-leverage, or should wait. Be honest.
- energy_sequence: 5-7 time blocks covering the full day. Match energy to task type.
- prepare_tomorrow: Concrete deliverables that must exist before sleep. Not "review" or "think about."
- task_id: If the item maps to a provided task, include its id. Otherwise null.
- Be decisive. Short sentences. No consultant language. No pleasantries.
- If overdue tasks exist, flag them in must_do with reason explaining urgency.
- If a task is P4/someday, it goes in skip unless there's a specific reason today.
- Return ONLY valid JSON matching the schema.`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { tasks, display_name, timezone } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const tz = timezone || "America/New_York";
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', { timeZone: tz });
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const timeNow = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz });

    const taskSummary = (tasks || [])
      .map((t: any) => {
        const overdue = t.due_date && new Date(t.due_date) < now && t.status !== "done";
        return `- id:${t.id} [${t.priority.toUpperCase()}] "${t.title}" | Context: ${t.context} | Energy: ${t.energy_type} | Est: ${t.estimated_duration_min || "?"}min | Due: ${t.due_date ? new Date(t.due_date).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No deadline"} | Status: ${t.status}${overdue ? " ⚠️ OVERDUE" : ""}`;
      })
      .join("\n");

    const userMessage = `Today is ${dayOfWeek}, ${today}. Current time: ${timeNow}.
${display_name ? `Name: ${display_name}` : ""}

Active tasks:
${taskSummary || "No tasks."}

Generate the CEO briefing JSON.`;

    const taskItemSchema = {
      type: "object",
      properties: {
        task_id: { type: "string", nullable: true },
        title: { type: "string" },
        reason: { type: "string" },
      },
      required: ["title", "reason"],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "object",
              properties: {
                must_do: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_id: { type: "string", nullable: true },
                      title: { type: "string" },
                      reason: { type: "string" },
                      time_block: { type: "string", nullable: true },
                    },
                    required: ["title", "reason"],
                  },
                },
                should_do: { type: "array", items: taskItemSchema },
                skip: { type: "array", items: taskItemSchema },
                prepare_tomorrow: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { action: { type: "string" } },
                    required: ["action"],
                  },
                },
                energy_sequence: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      time: { type: "string" },
                      activity: { type: "string" },
                      type: { type: "string", enum: ["deep", "shallow", "rest"] },
                    },
                    required: ["time", "activity", "type"],
                  },
                },
                intention: { type: "string" },
              },
              required: ["must_do", "should_do", "skip", "prepare_tomorrow", "energy_sequence", "intention"],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("Gemini API error");
    }

    const result = await response.json();
    const raw = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("No content in Gemini response");

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse Gemini JSON:", raw);
      parsed = {
        must_do: [], should_do: [], skip: [],
        prepare_tomorrow: [], energy_sequence: [],
        intention: "Briefing generation failed. Review tasks manually."
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-briefing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
