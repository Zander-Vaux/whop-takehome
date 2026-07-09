import Link from "next/link";
import "./globals.css";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { getRole } from "@/lib/role";

export const metadata = {
  title: "CreatorJobs",
  description: "Two-sided marketplace powered by Whop",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getRole();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold">
                CreatorJobs
              </Link>
              <nav className="flex gap-4 text-sm text-zinc-600">
                <Link href="/">Marketplace</Link>
                <Link href="/sell">Sell</Link>
                <Link href="/sell/listings">Listings</Link>
                <Link href="/sell/payouts">Payouts</Link>
                <Link href="/admin">Admin</Link>
              </nav>
            </div>
            <RoleSwitcher currentRole={role} />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
