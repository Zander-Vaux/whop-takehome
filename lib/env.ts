function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get whopApiKey(): string {
    return requireEnv("WHOP_API_KEY");
  },
  get whopPlatformCompanyId(): string {
    return requireEnv("WHOP_PLATFORM_COMPANY_ID");
  },
  get whopWebhookSecret(): string | undefined {
    return process.env.WHOP_WEBHOOK_SECRET;
  },
  get platformFeeBps(): number {
    const raw = requireEnv("PLATFORM_FEE_BPS");
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Missing required environment variable: PLATFORM_FEE_BPS");
    }
    return parsed;
  },
  get supabaseUrl(): string {
    return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseServiceRoleKey(): string {
    return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get appUrl(): string {
    return requireEnv("NEXT_PUBLIC_APP_URL");
  },
  get whopEnvironment(): "sandbox" | "production" {
    return process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "production"
      ? "production"
      : "sandbox";
  },
};
