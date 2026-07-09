"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/components/StatusBadge";

type Order = {
  id: string;
  state: string;
  buyer_email: string;
  amount_cents: number;
  application_fee_cents: number;
  whop_payment_id: string | null;
  listings: { title: string; description: string | null };
};

export default function OrderPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        if (active) setOrder(data.order);
        if (data.order.state === "pending_payment") {
          setTimeout(poll, 2000);
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Error");
      }
    }

    poll();
    return () => {
      active = false;
    };
  }, [orderId]);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!order) {
    return <p className="text-zinc-600">Loading order…</p>;
  }

  if (order.state === "pending_payment") {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <h1 className="text-xl font-semibold">Confirming payment…</h1>
        <p className="mt-2 text-zinc-600">
          Waiting for a verified Whop webhook. This page polls every 2 seconds.
        </p>
        <p className="mt-4 text-sm text-zinc-500">Order {order.id}</p>
      </div>
    );
  }

  if (order.state === "failed") {
    return (
      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-900">Payment failed</h1>
        <p className="text-sm text-red-800">Return to the marketplace to try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">Receipt</h1>
      <p className="text-emerald-700">Payment confirmed via webhook.</p>
      <dl className="grid gap-2 text-sm">
        <div>
          <dt className="text-zinc-500">Listing</dt>
          <dd>{order.listings.title}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Buyer</dt>
          <dd>{order.buyer_email}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Amount</dt>
          <dd>{formatCents(order.amount_cents)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Platform fee</dt>
          <dd>{formatCents(order.application_fee_cents)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Whop payment</dt>
          <dd className="break-all">{order.whop_payment_id ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}
