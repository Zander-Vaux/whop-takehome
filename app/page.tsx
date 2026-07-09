import { getSupabase } from "@/lib/supabase";
import HomePageClient from "@/components/HomePageClient";

export default async function Page() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("listings")
    .select("id, title, description, price_cents, sellers!inner(name, kyc_status)")
    .eq("active", true)
    .eq("sellers.kyc_status", "verified")
    .order("created_at", { ascending: false });

  const listings = (data ?? []).map((row) => {
    const sellers = row.sellers as { name: string } | { name: string }[];
    const seller = Array.isArray(sellers) ? sellers[0] : sellers;
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      price_cents: row.price_cents as number,
      sellers: { name: seller?.name ?? "Seller" },
    };
  });

  return <HomePageClient initialListings={listings} />;
}
