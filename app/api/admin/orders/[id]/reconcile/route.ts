import { NextResponse } from "next/server";
import { reconcileOrderWithWhop } from "@/lib/reconcile";
import { getRole } from "@/lib/role";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const result = await reconcileOrderWithWhop(id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
