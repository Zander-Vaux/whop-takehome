import { NextResponse } from "next/server";
import { syncSellerKycFromWhop } from "@/lib/sellers";
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

  if (error || !seller) {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }

  try {
    const updated = await syncSellerKycFromWhop(seller);
    return NextResponse.json({ seller: updated });
  } catch (err) {
    return NextResponse.json({ error: whopErrorMessage(err) }, { status: 500 });
  }
}
