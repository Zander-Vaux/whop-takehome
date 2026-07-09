import { env } from "./env";

export function calculateApplicationFeeCents(priceCents: number): number {
  return Math.floor((priceCents * env.platformFeeBps) / 10000);
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}
