"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

type Seller = {
  id: string;
  name: string;
  email: string;
  whop_company_id: string | null;
  kyc_status: string;
};

const STORAGE_KEY = "creatorjobs_seller_id";

export default function SellPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [seller, setSeller] = useState<Seller | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      fetch(`/api/sellers/${stored}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setSeller(d.seller))
        .catch(() => undefined);
    }
  }, []);

  async function createSeller(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSeller(data.seller);
      localStorage.setItem(STORAGE_KEY, data.seller.id);
      setMessage("Connected account created.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function startOnboarding() {
    if (!seller) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sellers/${seller.id}/onboarding-link`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      window.location.href = data.url;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!seller) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/sellers/${seller.id}/kyc-sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSeller(data.seller);
      setMessage("KYC status synced from Whop.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const kycLabel =
    seller?.kyc_status === "verified"
      ? "Verified"
      : seller
        ? "Verification pending"
        : "Created";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Seller onboarding</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create a Whop connected account and complete hosted KYC. Redirect alone does not verify you.
        </p>
      </div>

      {!seller ? (
        <form onSubmit={createSeller} className="space-y-4 rounded-lg border bg-white p-6">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
          >
            Create connected account
          </button>
        </form>
      ) : (
        <div className="space-y-4 rounded-lg border bg-white p-6">
          <p>
            <span className="text-zinc-500">Seller:</span> {seller.name}
          </p>
          <p className="break-all text-sm">
            <span className="text-zinc-500">Whop company:</span>{" "}
            {seller.whop_company_id ?? "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={`KYC: ${kycLabel}`} ok={seller.kyc_status === "verified"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startOnboarding}
              disabled={loading}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              Start onboarding
            </button>
            <button
              type="button"
              onClick={checkStatus}
              disabled={loading}
              className="rounded border px-4 py-2 text-sm"
            >
              Check status
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-zinc-700">{message}</p>}
    </div>
  );
}
