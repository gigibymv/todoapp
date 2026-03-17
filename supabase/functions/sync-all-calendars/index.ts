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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all enabled calendar links
    const { data: links, error: linksErr } = await supabase
      .from("calendar_links")
      .select("id, ics_url, user_id")
      .eq("enabled", true);

    if (linksErr) throw linksErr;
    if (!links || links.length === 0) {
      console.log("No enabled calendar links found");
      return new Response(JSON.stringify({ success: true, synced: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Syncing ${links.length} calendar links`);
    let synced = 0;
    let errors = 0;

    for (const link of links) {
      try {
        // Call the existing sync-calendar function internally
        const resp = await fetch(`${supabaseUrl}/functions/v1/sync-calendar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            calendar_link_id: link.id,
            ics_url: link.ics_url,
            user_id: link.user_id,
          }),
        });

        if (resp.ok) {
          synced++;
          console.log(`Synced calendar link ${link.id} for user ${link.user_id}`);
        } else {
          const err = await resp.text();
          console.error(`Failed to sync link ${link.id}: ${err}`);
          errors++;
        }
      } catch (e) {
        console.error(`Error syncing link ${link.id}:`, e);
        errors++;
      }
    }

    console.log(`Sync complete: ${synced} success, ${errors} errors`);
    return new Response(JSON.stringify({ success: true, synced, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-all-calendars error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
