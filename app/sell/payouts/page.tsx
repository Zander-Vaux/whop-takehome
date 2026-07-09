"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

const STORAGE_KEY = "creatorjobs_seller_id";

type Seller = {
  id: string;
  kyc_status: string;
  payout_method_linked: boolean;
  payout_eligible: boolean;
};

export default function PayoutsPage() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return;
    fetch(`/api/sellers/${id}`)
      .then((r) => r.json())
      .then((d) => setSeller(d.seller));
  }, []);

  async function openPortal() {
    if (!seller) return;
    const res = await fetch(`/api/sellers/${seller.id}/payout-link`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    window.location.href = data.url;
  }

  async function syncPayout() {
    if (!seller) return;
    const res = await fetch(`/api/sellers/${seller.id}/payout-sync`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    setSeller(data.seller);
    setMessage("Payout status synced.");
  }

  const blockers: string[] = [];
  if (seller?.kyc_status !== "verified") {
    blockers.push("Identity verification is still pending.");
  } else if (!seller.payout_method_linked) {
    blockers.push("Verification is complete, but no payout method is connected.");
  } else if (!seller.payout_eligible) {
    blockers.push("Whop has not marked this seller eligible for payouts.");
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Payout readiness</h1>
      <p className="text-sm text-zinc-600">
        KYC, payout method, and eligibility are tracked separately.
      </p>

      {seller ? (
        <div className="space-y-3 rounded-lg border bg-white p-6">
          <StatusBadge
            label="KYC verified"
            ok={seller.kyc_status === "verified"}
          />
          <StatusBadge
            label="Payout method connected"
            ok={seller.payout_method_linked}
          />
          <StatusBadge label="Payout eligible" ok={seller.payout_eligible} />

          {blockers.map((b) => (
            <p key={b} className="text-sm text-amber-800">
              {b}
            </p>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={openPortal}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
            >
              Open payout portal
            </button>
            <button type="button" onClick={syncPayout} className="rounded border px-4 py-2 text-sm">
              Sync from Whop
            </button>
          </div>
        </div>
      ) : (
        <p className="text-zinc-500">Create a seller on /sell first.</p>
      )}

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
