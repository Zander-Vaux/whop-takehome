import { NextResponse } from "next/server";
import { createWhopClient } from "@/lib/whop";
import { getSupabase } from "@/lib/supabase";
import { logWhopError } from "@/lib/whop-errors";

export async function GET() {
  let supabaseStatus: "ok" | "error" = "error";
  let whopStatus: "ok" | "error" = "error";

  try {
    getSupabase();
    const { error } = await getSupabase().from("sellers").select("id").limit(1);
    supabaseStatus = error ? "error" : "ok";
  } catch {
    supabaseStatus = "error";
  }

  try {
    const whop = createWhopClient();
    await whop.accounts.me();
    whopStatus = "ok";
  } catch (error) {
    logWhopError("health.whop", error, { endpoint: "accounts.me" });
    whopStatus = "error";
  }

  return NextResponse.json({ supabase: supabaseStatus, whop: whopStatus });
}
