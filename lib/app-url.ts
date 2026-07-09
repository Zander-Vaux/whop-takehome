const CANONICAL_PRODUCTION_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (CANONICAL_PRODUCTION_URL) {
    return CANONICAL_PRODUCTION_URL;
  }
  return "http://localhost:3000";
}

export function getWhopFrontendBase(): string {
  return process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "production"
    ? "https://whop.com"
    : "https://sandbox.whop.com";
}

export function resolveWhopCheckoutUrl(purchaseUrl: string): string {
  if (purchaseUrl.startsWith("http://") || purchaseUrl.startsWith("https://")) {
    return purchaseUrl;
  }
  return `${getWhopFrontendBase()}${purchaseUrl.startsWith("/") ? "" : "/"}${purchaseUrl}`;
}
