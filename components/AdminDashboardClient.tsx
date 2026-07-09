"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/components/StatusBadge";

type OrderRow = {
  id: string;
  state: string;
  buyer_email: string;
  amount_cents: number;
  application_fee_cents: number;
  whop_payment_id: string | null;
  listings: { title: string };
  sellers: {
    name: string;
    kyc_status: string;
    payout_method_linked: boolean;
    payout_eligible: boolean;
  };
};

type WebhookRow = {
  id: string;
  event_type: string;
  company_id: string | null;
  status: string;
  error: string | null;
  received_at: string;
  processed_at: string | null;
  payload: Record<string, unknown>;
};

export function AdminDashboardClient({
  orders,
  webhooks,
  stateFilter,
}: {
  orders: OrderRow[];
  webhooks: WebhookRow[];
  stateFilter: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function reconcile(orderId: string) {
    const res = await fetch(`/api/admin/orders/${orderId}/reconcile`, {
      method: "POST",
    });
    const data = await res.json();
    setActionMessage(
      res.ok ? `Order ${orderId}: ${data.detail}` : data.error ?? "Failed"
    );
    router.refresh();
  }

  async function retryWebhook(id: string) {
    const res = await fetch(`/api/admin/webhooks/${id}/retry`, { method: "POST" });
    const data = await res.json();
    setActionMessage(res.ok ? `Webhook retried` : data.error ?? "Failed");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Operations dashboard</h1>
        <p className="text-sm text-zinc-600">Observe → Diagnose → Remediate</p>
      </div>

      {actionMessage && (
        <p className="rounded bg-zinc-100 px-3 py-2 text-sm">{actionMessage}</p>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Orders</h2>
          <div className="flex gap-2 text-sm">
            {["", "pending_payment", "paid", "failed", "refunded"].map((s) => (
              <Link
                key={s || "all"}
                href={s ? `/admin?state=${s}` : "/admin"}
                className={`rounded px-2 py-1 ${
                  stateFilter === s ? "bg-zinc-900 text-white" : "bg-zinc-200"
                }`}
              >
                {s || "all"}
              </Link>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-zinc-50 text-zinc-600">
              <tr>
                <th className="p-3">Buyer</th>
                <th className="p-3">Listing</th>
                <th className="p-3">Seller</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Fee</th>
                <th className="p-3">State</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Seller status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b align-top">
                  <td className="p-3">{o.buyer_email}</td>
                  <td className="p-3">{o.listings.title}</td>
                  <td className="p-3">{o.sellers.name}</td>
                  <td className="p-3">{formatCents(o.amount_cents)}</td>
                  <td className="p-3">{formatCents(o.application_fee_cents)}</td>
                  <td className="p-3 font-medium">{o.state}</td>
                  <td className="max-w-[120px] truncate p-3 text-xs">
                    {o.whop_payment_id ?? "—"}
                  </td>
                  <td className="p-3 text-xs">
                    KYC {o.sellers.kyc_status}
                    <br />
                    Method {o.sellers.payout_method_linked ? "yes" : "no"}
                    <br />
                    Eligible {o.sellers.payout_eligible ? "yes" : "no"}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="text-xs text-blue-700 underline"
                      onClick={() => reconcile(o.id)}
                    >
                      Re-check with Whop
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Webhooks (last 50)</h2>
        <ul className="space-y-2">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className={`rounded-lg border p-4 ${
                w.status === "failed" ? "border-red-300 bg-red-50" : "bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{w.event_type}</p>
                  <p className="text-xs text-zinc-500">
                    {w.company_id ?? "—"} · {w.status} · {w.received_at}
                  </p>
                  {w.error && (
                    <p className="mt-1 text-sm text-red-700">{w.error}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() =>
                      setExpanded(expanded === w.id ? null : w.id)
                    }
                  >
                    {expanded === w.id ? "Hide" : "Payload"}
                  </button>
                  {(w.status === "failed" || w.status === "received") && (
                    <button
                      type="button"
                      className="text-xs text-blue-700 underline"
                      onClick={() => retryWebhook(w.id)}
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
              {expanded === w.id && (
                <pre className="mt-3 max-h-64 overflow-auto rounded bg-zinc-100 p-2 text-xs">
                  {JSON.stringify(w.payload, null, 2)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
