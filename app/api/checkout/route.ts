import { NextResponse } from "next/server";
import { createWhopClient } from "@/lib/whop";
import { getAppUrl, resolveWhopCheckoutUrl } from "@/lib/app-url";
import { calculateApplicationFeeCents, centsToDollars } from "@/lib/fees";
import { getSupabase } from "@/lib/supabase";
import { whopErrorMessage, logWhopError } from "@/lib/whop-errors";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    listingId?: string;
    buyerEmail?: string;
  };

  if (!body.listingId || !body.buyerEmail?.trim()) {
    return NextResponse.json(
      { error: "listingId and buyerEmail are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*, sellers(*)")
    .eq("id", body.listingId)
    .eq("active", true)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const seller = listing.sellers as {
    id: string;
    kyc_status: string;
    whop_company_id: string | null;
  };

  if (seller.kyc_status !== "verified") {
    return NextResponse.json(
      { error: "Seller is not verified for checkout" },
      { status: 403 }
    );
  }

  if (!seller.whop_company_id) {
    return NextResponse.json(
      { error: "Seller missing Whop connected account" },
      { status: 422 }
    );
  }

  const applicationFeeCents = calculateApplicationFeeCents(listing.price_cents);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      listing_id: listing.id,
      seller_id: seller.id,
      buyer_email: body.buyerEmail.trim(),
      state: "pending_payment",
      amount_cents: listing.price_cents,
      application_fee_cents: applicationFeeCents,
    })
    .select("*")
    .single();

  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Failed to create order" },
      { status: 500 }
    );
  }

  try {
    const whop = createWhopClient();
    const appUrl = getAppUrl();
    const checkout = await whop.checkoutConfigurations.create({
      mode: "payment",
      metadata: {
        order_id: order.id,
        listing_id: listing.id,
        seller_id: seller.id,
      },
      redirect_url: `${appUrl}/order/${order.id}`,
      plan: {
        company_id: seller.whop_company_id,
        currency: listing.currency as "usd",
        plan_type: "one_time",
        initial_price: centsToDollars(listing.price_cents),
        application_fee_amount: centsToDollars(applicationFeeCents),
        title: listing.title,
        product: {
          external_identifier: listing.id,
          title: listing.title,
        },
      },
    });

    await supabase
      .from("orders")
      .update({
        whop_checkout_config_id: checkout.id,
        whop_plan_id: checkout.plan?.id ?? null,
      })
      .eq("id", order.id);

    const checkoutUrl = resolveWhopCheckoutUrl(checkout.purchase_url);

    return NextResponse.json({
      orderId: order.id,
      checkoutUrl,
    });
  } catch (error) {
    logWhopError("checkout.create", error, {
      endpoint: "checkoutConfigurations.create",
      internalId: order.id,
    });
    await supabase
      .from("orders")
      .update({ state: "failed" })
      .eq("id", order.id)
      .eq("state", "pending_payment");

    return NextResponse.json({ error: whopErrorMessage(error) }, { status: 500 });
  }
}
