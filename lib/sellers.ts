import { createWhopClient } from "./whop";
import { getSupabase, Seller } from "./supabase";
import { logWhopError } from "./whop-errors";
import { env } from "./env";

const INTERNAL_SELLER_METADATA_KEY = "internal_seller_id";

export async function findChildCompanyBySellerId(
  sellerId: string
): Promise<string | null> {
  const whop = createWhopClient();
  for await (const company of whop.companies.list({
    parent_company_id: env.whopPlatformCompanyId,
  })) {
    const metadata = company.metadata as Record<string, unknown> | null;
    if (metadata?.[INTERNAL_SELLER_METADATA_KEY] === sellerId) {
      return company.id;
    }
  }
  return null;
}

export async function createSellerWithWhopCompany(input: {
  name: string;
  email: string;
}): Promise<Seller> {
  const supabase = getSupabase();

  const { data: existingByEmail } = await supabase
    .from("sellers")
    .select("*")
    .eq("email", input.email)
    .maybeSingle();

  if (existingByEmail?.whop_company_id) {
    return existingByEmail as Seller;
  }

  const { data: seller, error: insertError } = await supabase
    .from("sellers")
    .insert({
      name: input.name,
      email: input.email,
    })
    .select("*")
    .single();

  if (insertError || !seller) {
    throw new Error(insertError?.message ?? "Failed to create seller");
  }

  if (seller.whop_company_id) {
    return seller as Seller;
  }

  const whop = createWhopClient();
  let whopCompanyId: string;

  try {
    const created = await whop.companies.create({
      title: `${input.name} — CreatorJobs`,
      email: input.email,
      parent_company_id: env.whopPlatformCompanyId,
      metadata: {
        [INTERNAL_SELLER_METADATA_KEY]: seller.id,
        creatorjobs_marketplace: "true",
      },
    });
    whopCompanyId = created.id;
  } catch (error) {
    const reconciled = await findChildCompanyBySellerId(seller.id);
    if (reconciled) {
      whopCompanyId = reconciled;
    } else {
      logWhopError("createSellerWithWhopCompany", error, {
        endpoint: "companies.create",
        internalId: seller.id,
      });
      throw error;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("sellers")
    .update({ whop_company_id: whopCompanyId })
    .eq("id", seller.id)
    .is("whop_company_id", null)
    .select("*")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return (updated ?? { ...seller, whop_company_id: whopCompanyId }) as Seller;
}

type VerificationListResponse = {
  data?: Array<{ status?: string; kind?: string }>;
};

const VERIFIED_STATUSES = new Set(["approved", "verified"]);

export async function syncSellerKycFromWhop(seller: Seller): Promise<Seller> {
  if (!seller.whop_company_id) {
    throw new Error("Seller has no connected Whop company");
  }

  let verified = false;

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "production" ? "https://api.whop.com/api/v1" : "https://sandbox-api.whop.com/api/v1"}/verifications?account_id=${encodeURIComponent(seller.whop_company_id)}`,
      {
        headers: {
          Authorization: `Bearer ${env.whopApiKey}`,
          "Api-Version-Date": "2026-07-08-1",
        },
      }
    );

    if (response.ok) {
      const body = (await response.json()) as VerificationListResponse;
      verified = (body.data ?? []).some((v) =>
        VERIFIED_STATUSES.has(v.status ?? "")
      );
    }
  } catch {
    // fall through to payout account path
  }

  if (!verified && seller.whop_payout_account_id) {
    const whop = createWhopClient();
    const payoutAccount = await whop.payoutAccounts.retrieve(
      seller.whop_payout_account_id
    );
    const status = payoutAccount.latest_verification?.status;
    verified = VERIFIED_STATUSES.has(status ?? "");
  }

  const supabase = getSupabase();
  const kyc_status = verified ? "verified" : "unverified";

  const { data, error } = await supabase
    .from("sellers")
    .update({
      kyc_status,
      kyc_verified_at: verified ? new Date().toISOString() : null,
    })
    .eq("id", seller.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update seller KYC");
  }

  return data as Seller;
}

export async function syncSellerPayoutFromWhop(seller: Seller): Promise<Seller> {
  if (!seller.whop_company_id) {
    throw new Error("Seller has no connected Whop company");
  }

  const whop = createWhopClient();

  let payoutMethodLinked = false;
  try {
    const methods = await whop.payoutMethods.list({
      company_id: seller.whop_company_id,
    });
    payoutMethodLinked = (methods.data?.length ?? 0) > 0;
  } catch (error) {
    logWhopError("syncSellerPayoutFromWhop.methods", error, {
      endpoint: "payoutMethods.list",
      internalId: seller.id,
    });
  }

  let payoutEligible = false;
  let payoutAccountId = seller.whop_payout_account_id;

  if (payoutAccountId) {
    try {
      const account = await whop.payoutAccounts.retrieve(payoutAccountId);
      payoutEligible = account.status === "connected";
    } catch (error) {
      logWhopError("syncSellerPayoutFromWhop.account", error, {
        endpoint: "payoutAccounts.retrieve",
        internalId: seller.id,
      });
    }
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sellers")
    .update({
      payout_method_linked: payoutMethodLinked,
      payout_eligible: payoutEligible,
      whop_payout_account_id: payoutAccountId,
    })
    .eq("id", seller.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update payout status");
  }

  return data as Seller;
}

export async function setSellerPayoutAccountId(
  sellerId: string,
  payoutAccountId: string
): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("sellers")
    .update({ whop_payout_account_id: payoutAccountId })
    .eq("id", sellerId);
}
