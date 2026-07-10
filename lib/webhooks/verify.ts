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
  try {
    return whop.webhooks.unwrap(rawBody, { headers });
  } catch {
    // Some dashboard versions return an already Base64-formatted Standard
    // Webhooks secret, while others return raw text that must be encoded.
    return whop.webhooks.unwrap(rawBody, { headers, key: secret.trim() });
  }
}

export function getWebhookMessageId(
  headers: Record<string, string>,
  payload: { id?: string }
): string {
  return headers["webhook-id"] ?? headers["Webhook-Id"] ?? payload.id ?? "";
}
