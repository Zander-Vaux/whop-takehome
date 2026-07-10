import Whop from "@whop/sdk";
import { env } from "./env";

const SANDBOX_BASE_URL = "https://sandbox-api.whop.com/api/v1";
const PRODUCTION_BASE_URL = "https://api.whop.com/api/v1";

export function getWhopBaseUrl(): string {
  return env.whopEnvironment === "production"
    ? PRODUCTION_BASE_URL
    : SANDBOX_BASE_URL;
}

function webhookKeyForSdk(secret: string | undefined): string | undefined {
  if (!secret) return undefined;
  const normalized = secret.trim();

  // Standard Webhooks accepts whsec_-prefixed Base64 secrets directly.
  // Whop may also display an unencoded secret, which its SDK expects as Base64.
  return normalized.startsWith("whsec_") ? normalized : btoa(normalized);
}

export function createWhopClient(): Whop {
  const webhookSecret = env.whopWebhookSecret;

  return new Whop({
    apiKey: env.whopApiKey,
    baseURL: getWhopBaseUrl(),
    webhookKey: webhookKeyForSdk(webhookSecret),
  });
}

export async function whopFetch<T>(
  path: string,
  init?: RequestInit & { experimental?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.whopApiKey}`,
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (init?.experimental) {
    headers["Api-Version-Date"] = "2026-07-08-1";
  }

  const response = await fetch(`${getWhopBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Whop API ${response.status} ${path}: ${body.slice(0, 300)}`
    );
  }

  return response.json() as Promise<T>;
}
