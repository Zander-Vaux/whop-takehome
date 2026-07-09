import OrderPageClient from "@/components/OrderPageClient";

export default async function OrderRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderPageClient orderId={id} />;
}
