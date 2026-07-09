import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import Whop from "@whop/sdk";

const PREFLIGHT_METADATA_KEY = "creatorjobs_preflight";
const SANDBOX_BASE_URL = "https://sandbox-api.whop.com/api/v1";

function loadEnv(): void {
  const root = resolve(__dirname, "..");
  if (existsSync(resolve(root, ".env.local"))) {
    config({ path: resolve(root, ".env.local") });
  } else if (existsSync(resolve(root, ".env"))) {
    config({ path: resolve(root, ".env") });
  }
}

function mask(value: string | undefined): string {
  if (!value) return "(missing)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function printResult(label: string, ok: boolean, detail?: string): void {
  const status = ok ? "OK" : "FAIL";
  console.log(`[${status}] ${label}${detail ? `: ${detail}` : ""}`);
}

async function main(): Promise<void> {
  loadEnv();

  const apiKey = process.env.WHOP_API_KEY;
  const platformCompanyId = process.env.WHOP_PLATFORM_COMPANY_ID;

  console.log("CreatorJobs Whop preflight");
  console.log(`Environment: sandbox`);
  console.log(`API base URL: ${SANDBOX_BASE_URL}`);
  console.log(`API key: ${mask(apiKey)}`);
  console.log(`Platform company: ${platformCompanyId ?? "(missing)"}`);
  console.log("");

  if (!apiKey) {
    printResult("WHOP_API_KEY present", false);
    console.log("\n[HUMAN] Add WHOP_API_KEY to .env.local and re-run.");
    process.exit(1);
  }

  if (!platformCompanyId) {
    printResult("WHOP_PLATFORM_COMPANY_ID present", false);
    console.log("\n[HUMAN] Add WHOP_PLATFORM_COMPANY_ID to .env.local and re-run.");
    process.exit(1);
  }

  const client = new Whop({
    apiKey,
    baseURL: SANDBOX_BASE_URL,
  });

  let allOk = true;

  try {
    const me = await client.accounts.me();
    printResult("Sandbox authentication", true, `account ${me.id}`);
  } catch (error) {
    allOk = false;
    const message = error instanceof Error ? error.message : String(error);
    printResult("Sandbox authentication", false, message);
  }

  try {
    const platform = await client.companies.retrieve(platformCompanyId);
    printResult("Platform company accessible", true, platform.title);
  } catch (error) {
    allOk = false;
    const message = error instanceof Error ? error.message : String(error);
    printResult("Platform company accessible", false, message);
  }

  let preflightCompanyId: string | null = null;

  try {
    for await (const company of client.companies.list({
      parent_company_id: platformCompanyId,
    })) {
      const metadata = company.metadata as Record<string, unknown> | null;
      if (metadata?.[PREFLIGHT_METADATA_KEY] === "true") {
        preflightCompanyId = company.id;
        break;
      }
    }

    if (preflightCompanyId) {
      printResult("Child company (reuse)", true, preflightCompanyId);
    } else {
      const created = await client.companies.create({
        title: `CreatorJobs Preflight ${new Date().toISOString().slice(0, 10)}`,
        email: `preflight+${Date.now()}@creatorjobs.dev`,
        parent_company_id: platformCompanyId,
        metadata: {
          [PREFLIGHT_METADATA_KEY]: "true",
          creatorjobs_role: "preflight_throwaway",
        },
      });
      preflightCompanyId = created.id;
      printResult("Child company (created)", true, created.id);
    }
  } catch (error) {
    allOk = false;
    const message = error instanceof Error ? error.message : String(error);
    printResult("Platforms / child company create", false, message);
    if (/403|forbidden|permission/i.test(message)) {
      console.log(
        "\n[HUMAN] Enable or request Whop Platforms access at https://sandbox.whop.com/dashboard/developer"
      );
    }
  }

  try {
    const webhooks = await client.webhooks.list({
      company_id: platformCompanyId,
      first: 1,
    });
    const count = webhooks.data?.length ?? 0;
    printResult("Webhook list permission", true, `${count} webhook(s) visible`);
  } catch (error) {
    allOk = false;
    const message = error instanceof Error ? error.message : String(error);
    printResult("Webhook list permission", false, message);
  }

  console.log("\nPreflight summary:");
  console.log(`- Child company ID: ${preflightCompanyId ?? "none"}`);
  console.log(`- Checkout SDK: client.checkoutConfigurations.create (stable)`);
  console.log(`- Webhook SDK: client.webhooks.create + unwrap (stable)`);
  console.log(`- child_resource_events: required true for marketplace`);

  if (!allOk) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
