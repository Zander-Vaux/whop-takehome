import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sellerId = searchParams.get("sellerId");
  const publicOnly = searchParams.get("public") === "1";

  const supabase = getSupabase();

  if (publicOnly) {
    const { data, error } = await supabase
      .from("listings")
      .select("*, sellers!inner(id, name, kyc_status)")
      .eq("active", true)
      .eq("sellers.kyc_status", "verified")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ listings: data ?? [] });
  }

  if (!sellerId) {
    return NextResponse.json({ error: "sellerId required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sellerId?: string;
    title?: string;
    description?: string;
    priceCents?: number;
  };

  if (!body.sellerId || !body.title?.trim() || !body.priceCents) {
    return NextResponse.json(
      { error: "sellerId, title, and priceCents are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  const { data: seller } = await supabase
    .from("sellers")
    .select("kyc_status")
    .eq("id", body.sellerId)
    .single();

  if (!seller || seller.kyc_status !== "verified") {
    return NextResponse.json(
      { error: "Seller must complete KYC verification before creating listings" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: body.sellerId,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      price_cents: body.priceCents,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ listing: data });
}
