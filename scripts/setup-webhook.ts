import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { getAppUrl } from "../lib/app-url";
import { createWhopClient } from "../lib/whop";
import { env } from "../lib/env";

function loadEnv(): void {
  const root = resolve(__dirname, "..");
  if (existsSync(resolve(root, ".env.local"))) {
    config({ path: resolve(root, ".env.local") });
  }
}

async function main(): Promise<void> {
  loadEnv();

  const appUrl = getAppUrl();
  const whop = createWhopClient();

  const webhook = await whop.webhooks.create({
    url: `${appUrl}/api/webhooks/whop`,
    resource_id: env.whopPlatformCompanyId,
    child_resource_events: true,
    enabled: true,
    events: [
      "payment.succeeded",
      "payment.failed",
      "verification.succeeded",
      "identity_profile.approved",
      "payout_method.created",
      "refund.created",
      "payout_account.status_updated",
    ],
  });

  console.log("Webhook registered");
  console.log(`Webhook ID: ${webhook.id}`);
  console.log(`URL: ${webhook.url}`);
  console.log(`child_resource_events: ${webhook.child_resource_events}`);
  console.log("");
  console.log("Add this to .env.local (shown once):");
  console.log(`WHOP_WEBHOOK_SECRET=${webhook.webhook_secret}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
