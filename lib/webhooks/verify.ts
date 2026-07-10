import { createWhopClient } from "../whop";
import { env } from "../env";

export function verifyWhopWebhook(
  rawBody: string,
  headers: Record<string, string>
): ReturnType<ReturnType<typeof createWhopClient>["webhooks"]["unwrap"]> {
  const secret = env.whopWebhookSecret;
  if (!secret) {
    throw new Error("WHOP_WEBHOOK_SECRET is not configured");
  }

  const whop = createWhopClient();
  return whop.webhooks.unwrap(rawBody, { headers });
}

export function getWebhookMessageId(
  headers: Record<string, string>,
  payload: { id?: string }
): string {
  return headers["webhook-id"] ?? headers["Webhook-Id"] ?? payload.id ?? "";
}
