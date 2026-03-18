import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY_MAIN = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY_MAIN) throw new Error("GEMINI_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { calendar_event_id, person_name, person_company, person_linkedin_url, user_display_name, existing_brief_id } = await req.json();

    if (!person_name) {
      return new Response(JSON.stringify({ error: "person_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event details if provided
    let eventSummary = "";
    if (calendar_event_id) {
      const { data: event } = await supabase
        .from("calendar_events")
        .select("summary, description")
        .eq("id", calendar_event_id)
        .single();
      if (event) {
        eventSummary = `Meeting: ${event.summary || "Untitled"}. ${event.description || ""}`;
      }
    }

    // LinkedIn lookup via native Gemini API with Google Search grounding
    let resolvedLinkedinUrl = person_linkedin_url || null;
    if (!resolvedLinkedinUrl) {
      if (GEMINI_API_KEY_MAIN) {
        const GEMINI_API_KEY = GEMINI_API_KEY_MAIN;
        try {
          const searchQuery = person_company
            ? `LinkedIn profile URL for ${person_name} at ${person_company} site:linkedin.com/in`
            : `LinkedIn profile URL for ${person_name} site:linkedin.com/in`;
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${searchQuery}\n\nReturn ONLY the LinkedIn URL (https://www.linkedin.com/in/...) if you find a confident match. If you cannot find it with certainty, return exactly: NOT_FOUND` }] }],
                tools: [{ google_search: {} }],
              }),
            }
          );
          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") || "";
            const match = text.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?/i);
            if (match) resolvedLinkedinUrl = match[0];
          }
        } catch (e) {
          console.error("LinkedIn lookup error:", e);
        }
      }
    }

    // Build list of user's own names to exclude from results
    const userNames = (user_display_name || "").split(/\s+/).filter((n: string) => n.length > 1);
    const excludeClause = userNames.length > 0
      ? `\n\nIMPORTANT: The user preparing this brief is named "${user_display_name}". Do NOT include any information about them. Only research and discuss the OTHER person: ${person_name}. Ignore any mention of ${userNames.join(", ")} — they are the user, not the subject.`
      : "";

    const systemPrompt = `You are an elite executive briefing assistant. You prepare detailed, insightful 1:1 meeting briefs that go beyond surface-level information.

RESEARCH DEPTH:
- Dig into what the person ACTUALLY does day-to-day, not just their title. What problems do they solve? What teams/products do they own?
- Identify their career trajectory — where they came from, what pattern their moves reveal about their interests and ambitions.
- Look for recent activity: talks, publications, company news, product launches, fundraising, or strategic moves at their company.
- If they're at a startup, describe the company's product, stage, and competitive landscape. If at a large company, describe their division's focus.

ACCURACY RULES:
- Only state facts you are confident about. If unsure, say so explicitly.
- Do NOT fabricate quotes, publications, or posts.
- For LinkedIn URL: only return if provided by user or you are highly confident. Must start with "https://www.linkedin.com/in/".

Given a person's name and context, provide:
1. A rich background summary (4-5 sentences covering their role, what their company/team does, career arc, and current focus areas)
2. Exactly 5 talking points — each must include a SPECIFIC conversation opener (a question or statement you can actually say). No generic topics like "ask about their role." Each point should reference something concrete about their work, company, or industry.

TALKING POINT QUALITY BAR:
- BAD: "Their career journey" → too vague
- GOOD: "Their transition from consulting at McKinsey to leading product at a Series B fintech — what drove that shift and what surprised them?"
- Each talking point must have a concrete hook the user can literally say out loud.${excludeClause}`;

    const userPrompt = `Prepare a deep-research coffee chat brief for a meeting with:
- Name: ${person_name}
${person_company ? `- Company: ${person_company}` : ""}
${resolvedLinkedinUrl ? `- LinkedIn: ${resolvedLinkedinUrl}` : ""}
${eventSummary ? `- Context: ${eventSummary}` : ""}

Go deep on what this person actually does, their company's current situation, and what would make for genuinely interesting conversation. Focus ONLY on ${person_name}.`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY_MAIN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      throw new Error(`Gemini API error ${aiResponse.status}: ${errText.slice(0, 300)}`);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("No content in Gemini response");

    const brief = JSON.parse(raw);

    // Validate LinkedIn URL - must be a proper linkedin.com/in/ URL
    const validateLinkedInUrl = (url: string | undefined | null): string | null => {
      if (!url || url.trim() === '') return null;
      const cleaned = url.trim();
      if (cleaned.match(/^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i)) {
        return cleaned.startsWith('https') ? cleaned : cleaned.replace('http://', 'https://');
      }
      return null;
    };

    const validatedLinkedinUrl = validateLinkedInUrl(brief.linkedin_url) || validateLinkedInUrl(resolvedLinkedinUrl) || validateLinkedInUrl(person_linkedin_url);

    const briefPayload = {
      user_id: user.id,
      calendar_event_id: calendar_event_id || null,
      person_name,
      person_company: person_company || null,
      person_linkedin_url: validatedLinkedinUrl,
      person_role: brief.person_role,
      background_summary: brief.background_summary,
      talking_points_json: brief.talking_points,
      research_json: brief,
      status: "ready",
    };

    let saved: any = null;
    if (existing_brief_id) {
      // Regenerating — update in place
      const { data, error: updateError } = await supabase
        .from("meeting_briefs")
        .update(briefPayload)
        .eq("id", existing_brief_id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (updateError) console.error("Update error:", updateError);
      saved = data;
    } else {
      // New brief — insert
      const { data, error: insertError } = await supabase
        .from("meeting_briefs")
        .insert(briefPayload)
        .select()
        .single();
      if (insertError) console.error("Insert error:", insertError);
      saved = data;
    }

    return new Response(JSON.stringify({ ...brief, id: saved?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prepare-coffee-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
