import { NextResponse } from "next/server";
import { getRole } from "@/lib/role";
import { getSupabase } from "@/lib/supabase";
import { processWebhookEvent } from "@/lib/webhooks/process";
import type { UnwrapWebhookEvent } from "@whop/sdk/resources/webhooks";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await context.params;
  const supabase = getSupabase();

  const { data: row, error } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Webhook event not found" }, { status: 404 });
  }

  try {
    await processWebhookEvent(row.payload as UnwrapWebhookEvent);
    await supabase
      .from("webhook_events")
      .update({
        status: "retried",
        error: null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
