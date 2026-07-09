import { getSupabase } from "./supabase";

export type TransitionResult =
  | { ok: true; previousState: string; newState: string }
  | { ok: false; reason: string; currentState?: string };

export async function transitionOrder(
  orderId: string,
  allowedFrom: string[],
  to: string
): Promise<TransitionResult> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("orders")
    .select("state")
    .eq("id", orderId)
    .single();

  if (fetchError || !existing) {
    return { ok: false, reason: "Order not found" };
  }

  const currentState = existing.state as string;

  if (!allowedFrom.includes(currentState)) {
    console.warn(
      `[orders] transition rejected order=${orderId} from=${currentState} wanted=${to} allowed=${allowedFrom.join(",")}`
    );
    return {
      ok: false,
      reason: `Invalid transition from ${currentState} to ${to}`,
      currentState,
    };
  }

  if (currentState === to) {
    return { ok: true, previousState: currentState, newState: to };
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ state: to, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .in("state", allowedFrom)
    .select("state")
    .maybeSingle();

  if (updateError) {
    return { ok: false, reason: updateError.message, currentState };
  }

  if (!updated) {
    const { data: latest } = await supabase
      .from("orders")
      .select("state")
      .eq("id", orderId)
      .single();
    return {
      ok: false,
      reason: "Concurrent state change",
      currentState: latest?.state as string | undefined,
    };
  }

  return { ok: true, previousState: currentState, newState: to };
}
