import { transitionOrder } from "./orders";
import { createWhopClient } from "./whop";
import { getSupabase } from "./supabase";
import { logWhopError } from "./whop-errors";

export async function reconcileOrderWithWhop(orderId: string): Promise<{
  changed: boolean;
  detail: string;
}> {
  const supabase = getSupabase();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    throw new Error("Order not found");
  }

  if (!order.whop_payment_id) {
    return { changed: false, detail: "No Whop payment ID on order" };
  }

  const whop = createWhopClient();
  let payment;
  try {
    payment = await whop.payments.retrieve(order.whop_payment_id);
  } catch (err) {
    logWhopError("reconcileOrderWithWhop", err, {
      endpoint: "payments.retrieve",
      internalId: orderId,
    });
    throw err;
  }

  const friendly = payment.substatus;
  let targetState: string | null = null;

  if (friendly === "succeeded") {
    targetState = "paid";
  } else if (friendly === "failed" || friendly === "canceled") {
    targetState = "failed";
  } else if (friendly === "refunded") {
    targetState = "refunded";
  }

  if (!targetState || targetState === order.state) {
    return {
      changed: false,
      detail: `Whop=${friendly ?? "unknown"} CreatorJobs=${order.state}`,
    };
  }

  const allowedFrom =
    targetState === "paid"
      ? ["pending_payment"]
      : targetState === "failed"
        ? ["pending_payment"]
        : targetState === "refunded"
          ? ["paid"]
          : [];

  const result = await transitionOrder(orderId, allowedFrom, targetState);
  if (!result.ok) {
    return {
      changed: false,
      detail: `Could not transition: ${result.reason}`,
    };
  }

  await supabase.from("audit_events").insert({
    entity_type: "order",
    entity_id: orderId,
    action: "reconcile",
    detail: {
      from: result.previousState,
      to: result.newState,
      whop_payment_id: order.whop_payment_id,
      whop_substatus: friendly,
    },
  });

  return {
    changed: true,
    detail: `${result.previousState} → ${result.newState} (Whop: ${friendly})`,
  };
}
