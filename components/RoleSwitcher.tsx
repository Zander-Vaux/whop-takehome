"use client";

import { useRouter } from "next/navigation";
import type { AppRole } from "@/lib/role";

export function RoleSwitcher({ currentRole }: { currentRole: AppRole }) {
  const router = useRouter();

  async function setRole(role: AppRole) {
    await fetch("/api/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  const roles: AppRole[] = ["buyer", "seller", "admin"];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">Role:</span>
      {roles.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => setRole(role)}
          className={`rounded px-2 py-1 capitalize ${
            currentRole === role
              ? "bg-zinc-900 text-white"
              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
