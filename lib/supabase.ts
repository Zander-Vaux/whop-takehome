import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export type Seller = {
  id: string;
  name: string;
  email: string;
  whop_company_id: string | null;
  kyc_status: string;
  payout_method_linked: boolean;
  payout_eligible: boolean;
  kyc_verified_at: string | null;
  whop_payout_account_id: string | null;
  created_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  active: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  listing_id: string;
  seller_id: string;
  buyer_email: string;
  state: string;
  whop_checkout_config_id: string | null;
  whop_plan_id: string | null;
  whop_payment_id: string | null;
  amount_cents: number;
  application_fee_cents: number;
  created_at: string;
  updated_at: string;
};

export type WebhookEventRow = {
  id: string;
  whop_message_id: string;
  event_type: string;
  company_id: string | null;
  payload: Record<string, unknown>;
  status: string;
  error: string | null;
  received_at: string;
  processed_at: string | null;
};
