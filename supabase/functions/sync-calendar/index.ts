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
    const authHeader = req.headers.get("Authorization");
    const { calendar_link_id, ics_url, user_id } = await req.json();

    if (!ics_url || !user_id || !calendar_link_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize calendar URL: webcal(s)://, http://, or bare domain → https://
    let fetchUrl = ics_url.trim();
    fetchUrl = fetchUrl.replace(/^webcals?:\/\//i, 'https://');
    if (!fetchUrl.match(/^https?:\/\//i)) {
      fetchUrl = 'https://' + fetchUrl;
    }
    // Force https for security
    fetchUrl = fetchUrl.replace(/^http:\/\//i, 'https://');

    const icsResp = await fetch(fetchUrl);
    if (!icsResp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch ICS: ${icsResp.status}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const icsText = await icsResp.text();
    console.log("ICS response length:", icsText.length);
    console.log("ICS first 500 chars:", icsText.slice(0, 500));
    const events = parseICS(icsText);
    console.log("Parsed events count:", events.length);
    if (events.length > 0) {
      console.log("First event:", JSON.stringify(events[0]));
    }

    // Use service role to upsert events
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Deduplicate by uid (recurring events share UIDs)
    const uidMap = new Map<string, any>();
    events.forEach(e => {
      const existing = uidMap.get(e.uid);
      if (!existing || new Date(e.dtstart) > new Date(existing.dtstart)) {
        uidMap.set(e.uid, e);
      }
    });

    const rows = Array.from(uidMap.values()).map(e => ({
      user_id,
      calendar_link_id,
      uid: e.uid,
      summary: e.summary || "Untitled",
      description: e.description || null,
      location: e.location || null,
      dtstart: e.dtstart,
      dtend: e.dtend || e.dtstart,
      all_day: e.allDay || false,
      recurrence_rule: e.rrule || null,
    }));

    console.log("Unique events to insert:", rows.length);

    if (rows.length > 0) {
      await supabase.from("calendar_events").delete().eq("calendar_link_id", calendar_link_id);
      
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        const { error } = await supabase.from("calendar_events").insert(chunk);
        if (error) console.error("Insert error:", error.message);
        else inserted += chunk.length;
      }
      console.log("Successfully inserted:", inserted);
    }

    // Update last_synced_at
    await supabase.from("calendar_links").update({ last_synced_at: new Date().toISOString() }).eq("id", calendar_link_id);

    return new Response(JSON.stringify({ success: true, events_count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Simple ICS parser
function parseICS(text: string) {
  const events: any[] = [];
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  let current: any = null;

  // Pre-scan for VTIMEZONE blocks to map custom TZID labels to offsets
  const tzAliases = new Map<string, string>();
  let inTZ = false;
  let currentTZID: string | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VTIMEZONE') { inTZ = true; currentTZID = null; }
    else if (line === 'END:VTIMEZONE') { inTZ = false; currentTZID = null; }
    else if (inTZ && line.startsWith('TZID:')) {
      currentTZID = line.slice(5).trim();
      const normalized = normalizeTimezone(currentTZID);
      if (normalized !== currentTZID) {
        tzAliases.set(currentTZID, normalized);
      }
    }
  }

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT" && current) {
      if (current.uid && current.dtstart) events.push(current);
      current = null;
    } else if (current) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1);

      if (key === "UID" || key.startsWith("UID;")) current.uid = value;
      else if (key === "SUMMARY" || key.startsWith("SUMMARY;")) current.summary = value;
      else if (key === "DESCRIPTION" || key.startsWith("DESCRIPTION;")) current.description = value.slice(0, 500);
      else if (key === "LOCATION" || key.startsWith("LOCATION;")) current.location = value;
      else if (key === "RRULE" || key.startsWith("RRULE;")) current.rrule = value;
      else if (key.startsWith("DTSTART")) {
        let tzid = extractTZID(key);
        if (tzid && tzAliases.has(tzid)) tzid = tzAliases.get(tzid)!;
        current.dtstart = parseICSDate(value, tzid);
        current.allDay = key.includes("VALUE=DATE") && !key.includes("VALUE=DATE-TIME");
      } else if (key.startsWith("DTEND")) {
        let tzid = extractTZID(key);
        if (tzid && tzAliases.has(tzid)) tzid = tzAliases.get(tzid)!;
        current.dtend = parseICSDate(value, tzid);
      }
    }
  }

  return events;
}

/** Extract TZID from a property key like "DTSTART;TZID=America/New_York" */
function extractTZID(key: string): string | null {
  const match = key.match(/TZID=([^;:]+)/i);
  return match ? normalizeTimezone(match[1]) : null;
}

/** Map Windows / legacy timezone names to IANA */
const TZ_MAP: Record<string, string> = {
  'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
  'Atlantic Standard Time': 'America/Halifax',
  'Hawaiian Standard Time': 'Pacific/Honolulu',
  'Alaskan Standard Time': 'America/Anchorage',
  'US Mountain Standard Time': 'America/Phoenix',
  'Eastern Daylight Time': 'America/New_York',
  'Central Daylight Time': 'America/Chicago',
  'Mountain Daylight Time': 'America/Denver',
  'Pacific Daylight Time': 'America/Los_Angeles',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Atlantic/Reykjavik',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central European Standard Time': 'Europe/Warsaw',
  'Romance Standard Time': 'Europe/Paris',
  'Central Europe Standard Time': 'Europe/Budapest',
  'E. Europe Standard Time': 'Europe/Chisinau',
  'FLE Standard Time': 'Europe/Kiev',
  'GTB Standard Time': 'Europe/Bucharest',
  'Russian Standard Time': 'Europe/Moscow',
  'Israel Standard Time': 'Asia/Jerusalem',
  'South Africa Standard Time': 'Africa/Johannesburg',
  'Arabian Standard Time': 'Asia/Dubai',
  'Arab Standard Time': 'Asia/Riyadh',
  'India Standard Time': 'Asia/Kolkata',
  'China Standard Time': 'Asia/Shanghai',
  'Tokyo Standard Time': 'Asia/Tokyo',
  'Korea Standard Time': 'Asia/Seoul',
  'AUS Eastern Standard Time': 'Australia/Sydney',
  'New Zealand Standard Time': 'Pacific/Auckland',
  'Morocco Standard Time': 'Africa/Casablanca',
  'W. Central Africa Standard Time': 'Africa/Lagos',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'US/Hawaii': 'Pacific/Honolulu',
  'US/Alaska': 'America/Anchorage',
  'US/Arizona': 'America/Phoenix',
};

function normalizeTimezone(tz: string): string {
  // Direct IANA name — validate it works
  const mapped = TZ_MAP[tz];
  if (mapped) return mapped;
  // Try as-is (covers IANA names like America/New_York, Europe/Paris)
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    console.warn(`Unknown timezone "${tz}", falling back to America/New_York`);
    return 'America/New_York';
  }
}

/**
 * Convert an ICS local datetime in a given timezone to a UTC ISO string.
 * Uses Intl to find the UTC offset for that timezone at that moment.
 */
function localToUTC(year: number, month: number, day: number, hour: number, min: number, sec: number, tz: string): string {
  // Create a formatter in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Start with a naive UTC guess
  const guess = new Date(Date.UTC(year, month - 1, day, hour, min, sec));

  // See what this guess looks like in the target timezone
  const parts = formatter.formatToParts(guess);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  const guessInTz = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

  // The offset = what the guess looks like in tz minus the guess itself
  const offsetMs = guessInTz - guess.getTime();

  // The correct UTC time = guess minus offset
  return new Date(guess.getTime() - offsetMs).toISOString();
}

function parseICSDate(value: string, tzid: string | null = null): string {
  // Handle formats: 20260315T100000Z, 20260315T100000, 20260315
  const clean = value.replace(/[^0-9TZ]/g, '');
  if (clean.length === 8) {
    // Date only: YYYYMMDD — all-day event, store as midnight UTC
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}T00:00:00Z`;
  }
  // DateTime: YYYYMMDDTHHmmss[Z]
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (match) {
    const [, y, m, d, h, mi, s, z] = match;
    if (z === 'Z') {
      // Already UTC
      return `${y}-${m}-${d}T${h}:${mi}:${s}Z`;
    }
    // Local time — convert using TZID if available, otherwise assume America/New_York
    const tz = tzid || 'America/New_York';
    try {
      return localToUTC(parseInt(y), parseInt(m), parseInt(d), parseInt(h), parseInt(mi), parseInt(s), tz);
    } catch {
      // Fallback: treat as UTC if timezone conversion fails
      return `${y}-${m}-${d}T${h}:${mi}:${s}Z`;
    }
  }
  return new Date(value).toISOString();
}
