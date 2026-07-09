import { NextResponse } from "next/server";
import { createWhopClient } from "@/lib/whop";
import { getAppUrl } from "@/lib/app-url";
import { getSupabase } from "@/lib/supabase";
import { whopErrorMessage } from "@/lib/whop-errors";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = getSupabase();
  const { data: seller, error } = await supabase
    .from("sellers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !seller?.whop_company_id) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  try {
    const whop = createWhopClient();
    const appUrl = getAppUrl();
    const link = await whop.accountLinks.create({
      company_id: seller.whop_company_id,
      use_case: "payouts_portal",
      return_url: `${appUrl}/sell/payouts?return=complete&sellerId=${id}`,
      refresh_url: `${appUrl}/sell/payouts?return=refresh&sellerId=${id}`,
    });

    return NextResponse.json({ url: link.url, expires_at: link.expires_at });
  } catch (err) {
    return NextResponse.json({ error: whopErrorMessage(err) }, { status: 500 });
  }
}
