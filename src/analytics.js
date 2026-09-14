import { supabase } from "./supabaseClient";

// Minimal, privacy-friendly event tracking. No cookies, no third-party
// service — just an insert into your own Supabase table. Fire-and-forget:
// never throws, never blocks the UI, and silently no-ops if the table
// doesn't exist yet (e.g. before you've run add-analytics-table.sql).
export function track(event, userId = null) {
  try {
    supabase.from("analytics_events").insert({ event, user_id: userId }).then(() => {}, () => {});
  } catch (e) {
    // never let analytics break the app
  }
}
