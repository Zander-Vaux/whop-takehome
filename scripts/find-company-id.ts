import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import Whop from "@whop/sdk";

const root = resolve(__dirname, "..");
if (existsSync(resolve(root, ".env.local"))) {
  config({ path: resolve(root, ".env.local") });
}

const SANDBOX = "https://sandbox-api.whop.com/api/v1";

async function main(): Promise<void> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    console.log("Set WHOP_API_KEY in .env.local first.");
    process.exit(1);
  }

  const client = new Whop({ apiKey, baseURL: SANDBOX });

  console.log("Trying to find your company ID (biz_…)…\n");

  try {
    const me = await client.accounts.me();
    console.log("Found via accounts.me():");
    console.log(`  WHOP_PLATFORM_COMPANY_ID=${me.id}`);
    console.log(`  Title: ${me.title}`);
    return;
  } catch (e) {
    console.log("accounts.me() failed:", (e as Error).message.slice(0, 150));
  }

  try {
    const list = await client.accounts.list();
    const accounts = list.accounts ?? [];
    if (accounts.length > 0) {
      console.log("\nFound via accounts.list():");
      for (const a of accounts) {
        console.log(`  WHOP_PLATFORM_COMPANY_ID=${a.id}  (${a.title})`);
      }
      return;
    }
  } catch (e) {
    console.log("accounts.list() failed:", (e as Error).message.slice(0, 150));
  }

  try {
    const page = await client.companies.list({ first: 10 });
    if (page.data?.length) {
      console.log("\nFound via companies.list():");
      for (const c of page.data) {
        console.log(`  WHOP_PLATFORM_COMPANY_ID=${c.id}  (${c.title})`);
      }
      return;
    }
  } catch (e) {
    console.log("companies.list() failed:", (e as Error).message.slice(0, 150));
  }

  console.log(`
Could not auto-detect. Find it manually:

1. Open https://sandbox.whop.com/dashboard
2. Look at the browser address bar — copy the part starting with biz_
   Example URL: https://sandbox.whop.com/dashboard/biz_XXXXXXXX/...
3. Or: top-left business switcher → open any dashboard page and check URL

If URL has no biz_, recreate your API key with Admin role at:
https://sandbox.whop.com/dashboard/developer
`);
}

main().catch(console.error);
