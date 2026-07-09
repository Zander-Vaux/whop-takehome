import { getSupabase } from "@/lib/supabase";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: stateFilter } = await searchParams;
  const supabase = getSupabase();

  let ordersQuery = supabase
    .from("orders")
    .select(
      "*, listings(title), sellers(name, kyc_status, payout_method_linked, payout_eligible)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (stateFilter) {
    ordersQuery = ordersQuery.eq("state", stateFilter);
  }

  const [{ data: orders }, { data: webhooks }] = await Promise.all([
    ordersQuery,
    supabase
      .from("webhook_events")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <AdminDashboardClient
      orders={(orders ?? []) as never[]}
      webhooks={(webhooks ?? []) as never[]}
      stateFilter={stateFilter ?? ""}
    />
  );
}
