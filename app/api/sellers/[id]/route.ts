import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ seller });
}
