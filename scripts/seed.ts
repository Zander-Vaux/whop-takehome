import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(): void {
  const root = resolve(__dirname, "..");
  if (existsSync(resolve(root, ".env.local"))) {
    config({ path: resolve(root, ".env.local") });
  }
}

async function main(): Promise<void> {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars required");
  }

  const supabase = createClient(url, key);

  const demoEmail = "demo-seller@creatorjobs.dev";
  const demoName = "[DEMO ONLY — not Whop verified] Demo Seller";

  const { data: existing } = await supabase
    .from("sellers")
    .select("id")
    .eq("email", demoEmail)
    .maybeSingle();

  let sellerId = existing?.id as string | undefined;

  if (!sellerId) {
    const { data: created, error } = await supabase
      .from("sellers")
      .insert({
        name: demoName,
        email: demoEmail,
        kyc_status: "verified",
        kyc_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    sellerId = created.id;
    console.log("Created demo seller", sellerId);
  } else {
    console.log("Reusing demo seller", sellerId);
  }

  const listings = [
    {
      title: "Logo design package",
      description: "Three concepts and one revision round.",
      price_cents: 5000,
    },
    {
      title: "Social content bundle",
      description: "Ten short-form posts with captions.",
      price_cents: 7500,
    },
  ];

  for (const listing of listings) {
    const { data: exists } = await supabase
      .from("listings")
      .select("id")
      .eq("seller_id", sellerId)
      .eq("title", listing.title)
      .maybeSingle();

    if (exists) {
      console.log("Listing exists:", listing.title);
      continue;
    }

    const { error } = await supabase.from("listings").insert({
      seller_id: sellerId,
      ...listing,
    });
    if (error) throw error;
    console.log("Created listing:", listing.title);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
