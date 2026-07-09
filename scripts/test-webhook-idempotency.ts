/**
 * Verifies webhook idempotency via unique whop_message_id constraint.
 * Run after Supabase schema is applied.
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(): void {
  const root = resolve(__dirname, "..");
  if (existsSync(resolve(root, ".env.local"))) {
    config({ path: resolve(root, ".env.local") });
  }
}

async function main(): Promise<void> {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env required");

  const supabase = createClient(url, key);
  const fixture = JSON.parse(
    readFileSync(
      resolve(__dirname, "../lib/webhooks/fixtures/payment-succeeded.json"),
      "utf8"
    )
  );

  const messageId = `test_${Date.now()}`;
  const row = {
    whop_message_id: messageId,
    event_type: fixture.type,
    company_id: fixture.company_id,
    payload: fixture,
    status: "received",
  };

  const first = await supabase.from("webhook_events").insert(row);
  if (first.error) throw first.error;

  const duplicate = await supabase.from("webhook_events").insert(row);
  if (duplicate.error?.code !== "23505") {
    throw new Error(`Expected duplicate key, got: ${duplicate.error?.message}`);
  }

  console.log("Idempotency OK: duplicate whop_message_id rejected");

  await supabase.from("webhook_events").delete().eq("whop_message_id", messageId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
