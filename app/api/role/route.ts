import { NextResponse } from "next/server";
import { roleCookieName, type AppRole } from "@/lib/role";

export async function POST(request: Request) {
  const body = (await request.json()) as { role?: AppRole };
  const role = body.role ?? "buyer";

  if (!["buyer", "seller", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const response = NextResponse.json({ role });
  response.cookies.set(roleCookieName(), role, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
