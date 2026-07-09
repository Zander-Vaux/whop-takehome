import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = getSupabase();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*, listings(title, description), sellers(name, kyc_status)")
    .eq("id", id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
