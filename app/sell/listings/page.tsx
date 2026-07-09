"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/components/StatusBadge";

const STORAGE_KEY = "creatorjobs_seller_id";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  active: boolean;
};

export default function ListingsPage() {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("50");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    setSellerId(id);
    if (id) loadListings(id);
  }, []);

  async function loadListings(id: string) {
    const res = await fetch(`/api/listings?sellerId=${id}`);
    const data = await res.json();
    setListings(data.listings ?? []);
  }

  async function createListing(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerId) {
      setMessage("Create a seller account on /sell first.");
      return;
    }
    const priceCents = Math.round(parseFloat(priceDollars) * 100);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId,
        title,
        description,
        priceCents,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed");
      return;
    }
    setMessage("Listing created.");
    setTitle("");
    setDescription("");
    loadListings(sellerId);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your listings</h1>

      <form onSubmit={createListing} className="space-y-3 rounded-lg border bg-white p-6">
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="w-full rounded border px-3 py-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          min="0.01"
          className="w-full rounded border px-3 py-2"
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
          required
        />
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 text-white">
          Create listing
        </button>
      </form>

      {message && <p className="text-sm">{message}</p>}

      <ul className="divide-y rounded-lg border bg-white">
        {listings.map((l) => (
          <li key={l.id} className="flex justify-between p-4">
            <div>
              <p className="font-medium">{l.title}</p>
              <p className="text-sm text-zinc-600">{l.description}</p>
            </div>
            <p>{formatCents(l.price_cents)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
