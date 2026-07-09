"use client";

import { useState } from "react";
import { formatCents } from "@/components/StatusBadge";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  sellers: { name: string };
};

export default function HomePage({
  initialListings,
}: {
  initialListings: Listing[];
}) {
  const [listings] = useState(initialListings);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function checkout(listingId: string) {
    setError(null);
    setLoadingId(listingId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, buyerEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CreatorJobs Marketplace</h1>
        <p className="mt-1 text-zinc-600">
          Buy services from verified creators. Payments are confirmed by Whop webhooks only.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">Buyer email</label>
        <input
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          className="mt-1 w-full max-w-md rounded border border-zinc-300 px-3 py-2"
          placeholder="you@company.com"
        />
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
        {listings.length === 0 && (
          <li className="p-6 text-zinc-500">No verified listings yet.</li>
        )}
        {listings.map((listing) => (
          <li key={listing.id} className="flex items-start justify-between gap-4 p-6">
            <div>
              <h2 className="font-medium">{listing.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{listing.description}</p>
              <p className="mt-2 text-sm text-zinc-500">Seller: {listing.sellers.name}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatCents(listing.price_cents)}</p>
              <button
                type="button"
                disabled={!buyerEmail || loadingId === listing.id}
                onClick={() => checkout(listing.id)}
                className="mt-2 rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {loadingId === listing.id ? "Starting…" : "Buy now"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
