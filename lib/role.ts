import { cookies } from "next/headers";

export type AppRole = "buyer" | "seller" | "admin";

const COOKIE_NAME = "creatorjobs_role";

export async function getRole(): Promise<AppRole> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (value === "seller" || value === "admin") return value;
  return "buyer";
}

export function roleCookieName(): string {
  return COOKIE_NAME;
}
