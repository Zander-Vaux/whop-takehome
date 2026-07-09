import { NextResponse } from "next/server";
import { createSellerWithWhopCompany } from "@/lib/sellers";
import { whopErrorMessage, isAuthError, isPermissionError } from "@/lib/whop-errors";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; email?: string };
    if (!body.name?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const seller = await createSellerWithWhopCompany({
      name: body.name.trim(),
      email: body.email.trim(),
    });

    return NextResponse.json({ seller });
  } catch (error) {
    const message = whopErrorMessage(error);
    const status = isAuthError(error) ? 401 : isPermissionError(error) ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
