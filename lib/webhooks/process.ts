import type { UnwrapWebhookEvent } from "@whop/sdk/resources/webhooks";
import { transitionOrder } from "../orders";
import { getSupabase } from "../supabase";
import {
  setSellerPayoutAccountId,
  syncSellerKycFromWhop,
} from "../sellers";

const VERIFIED_KYC = new Set(["approved", "verified"]);

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function paymentAmountCents(payment: {
  settlement_amount?: number;
}): number | null {
  const dollars = payment.settlement_amount;
  if (typeof dollars !== "number") return null;
  return Math.round(dollars * 100);
}

export async function processWebhookEvent(
  event: UnwrapWebhookEvent
): Promise<void> {
  switch (event.type) {
    case "payment.succeeded":
      await handlePaymentSucceeded(event);
      break;
    case "payment.failed":
      await handlePaymentFailed(event);
      break;
    case "refund.created":
      await handleRefundCreated(event);
      break;
    case "verification.succeeded":
    case "identity_profile.approved":
      await handleVerificationApproved(event);
      break;
    case "payout_method.created":
      await handlePayoutMethodCreated(event);
      break;
    case "payout_account.status_updated":
      await handlePayoutAccountStatusUpdated(event);
      break;
    default:
      break;
  }
}

async function handlePaymentSucceeded(
  event: Extract<UnwrapWebhookEvent, { type: "payment.succeeded" }>
): Promise<void> {
  const payment = event.data;
  const orderId =
    metadataString(payment.metadata as Record<string, unknown>, "order_id") ??
    metadataString(
      payment.metadata as Record<string, unknown>,
      "orderId"
    );

  if (!orderId) {
    throw new Error("payment.succeeded missing metadata.order_id");
  }

  const supabase = getSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const paidCents = paymentAmountCents(payment);
  if (paidCents !== null && paidCents !== order.amount_cents) {
    throw new Error(
      `Payment amount mismatch: whop=${paidCents} order=${order.amount_cents}`
    );
  }

  await supabase
    .from("orders")
    .update({ whop_payment_id: payment.id })
    .eq("id", orderId);

  const result = await transitionOrder(orderId, ["pending_payment"], "paid");
  if (!result.ok && result.currentState !== "paid") {
    throw new Error(result.reason);
  }
}

async function handlePaymentFailed(
  event: Extract<UnwrapWebhookEvent, { type: "payment.failed" }>
): Promise<void> {
  const payment = event.data;
  const orderId = metadataString(
    payment.metadata as Record<string, unknown>,
    "order_id"
  );
  if (!orderId) return;

  const result = await transitionOrder(orderId, ["pending_payment"], "failed");
  if (!result.ok && result.currentState !== "failed") {
    throw new Error(result.reason);
  }
}

async function handleRefundCreated(
  event: Extract<UnwrapWebhookEvent, { type: "refund.created" }>
): Promise<void> {
  const refund = event.data as { payment?: { id?: string; metadata?: Record<string, unknown> } };
  const payment = refund.payment;
  const orderId =
    metadataString(payment?.metadata, "order_id") ??
    (payment?.id
      ? await findOrderIdByPaymentId(payment.id)
      : undefined);

  if (!orderId) return;

  const result = await transitionOrder(orderId, ["paid"], "refunded");
  if (!result.ok && result.currentState !== "refunded") {
    throw new Error(result.reason);
  }
}

async function findOrderIdByPaymentId(
  paymentId: string
): Promise<string | undefined> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("whop_payment_id", paymentId)
    .maybeSingle();
  return data?.id as string | undefined;
}

async function handleVerificationApproved(
  event: Extract<
    UnwrapWebhookEvent,
    { type: "verification.succeeded" | "identity_profile.approved" }
  >
): Promise<void> {
  const companyId = event.company_id;
  if (!companyId) return;

  const supabase = getSupabase();
  const { data: seller } = await supabase
    .from("sellers")
    .select("*")
    .eq("whop_company_id", companyId)
    .maybeSingle();

  if (!seller) return;

  const status =
    "data" in event && event.data && typeof event.data === "object"
      ? (event.data as { status?: string }).status
      : undefined;

  if (status && !VERIFIED_KYC.has(status)) {
    return;
  }

  await supabase
    .from("sellers")
    .update({
      kyc_status: "verified",
      kyc_verified_at: new Date().toISOString(),
    })
    .eq("id", seller.id);

  await syncSellerKycFromWhop(seller);
}

async function handlePayoutMethodCreated(
  event: Extract<UnwrapWebhookEvent, { type: "payout_method.created" }>
): Promise<void> {
  const companyId = event.company_id;
  if (!companyId) return;

  const supabase = getSupabase();
  await supabase
    .from("sellers")
    .update({ payout_method_linked: true })
    .eq("whop_company_id", companyId);
}

async function handlePayoutAccountStatusUpdated(
  event: Extract<UnwrapWebhookEvent, { type: "payout_account.status_updated" }>
): Promise<void> {
  const companyId = event.company_id;
  const data = event.data as { id?: string; status?: string };
  if (!companyId) return;

  const supabase = getSupabase();
  const { data: seller } = await supabase
    .from("sellers")
    .select("*")
    .eq("whop_company_id", companyId)
    .maybeSingle();

  if (!seller) return;

  if (data.id) {
    await setSellerPayoutAccountId(seller.id, data.id);
  }

  await supabase
    .from("sellers")
    .update({
      payout_eligible: data.status === "connected",
    })
    .eq("id", seller.id);
}
