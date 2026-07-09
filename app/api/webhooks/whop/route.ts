import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  getWebhookMessageId,
  verifyWhopWebhook,
} from "@/lib/webhooks/verify";
import { processWebhookEvent } from "@/lib/webhooks/process";

export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  let event;
  try {
    event = verifyWhopWebhook(rawBody, headers);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const messageId = getWebhookMessageId(headers, { id: event.id });
  if (!messageId) {
    return NextResponse.json({ error: "Missing message id" }, { status: 400 });
  }

  const supabase = getSupabase();

  const { error: insertError } = await supabase.from("webhook_events").insert({
    whop_message_id: messageId,
    event_type: event.type,
    company_id: event.company_id ?? null,
    payload: event as unknown as Record<string, unknown>,
    status: "received",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "Persistence failed" }, { status: 500 });
  }

  try {
    await processWebhookEvent(event);
    await supabase
      .from("webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("whop_message_id", messageId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("webhook_events")
      .update({
        status: "failed",
        error: message,
        processed_at: new Date().toISOString(),
      })
      .eq("whop_message_id", messageId);
  }

  return NextResponse.json({ ok: true });
}
