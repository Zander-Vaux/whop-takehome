# CreatorJobs — Blockers and Fallbacks

## Experimental → Stable fallbacks

| Capability | Attempted | Used | Reason |
|------------|-----------|------|--------|
| Child company create | `accounts.create` (Experimental) | **Stable `companies.create`** | SDK `AccountCreateParams` lacks `parent_company_id` and `title`; Stable API matches platforms docs for explicit child companies under `parent_company_id` |
| Checkout | Beta checkout docs | **Stable `checkoutConfigurations.create`** | No separate Experimental client in `@whop/sdk` v0.0.40; stable types include inline plan + `application_fee_amount` |
| Webhooks | — | **Stable `webhooks.create`** | No beta webhook resource in SDK |
| Verification list by account | Docs `GET /verifications?account_id=` | **Stable `payoutAccounts.retrieve` + `payoutMethods.list`** | SDK `verifications.list` requires `payout_account_id`, not `account_id`; payout account status is authoritative for KYC/payout readiness |
| KYC webhooks | `verification.succeeded` | **Also subscribe `identity_profile.approved`** | Both appear in SDK `WebhookEvent` enum; hosted onboarding may emit either |

## Sandbox limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Payouts not fully available in sandbox | Sellers may not complete real withdrawals | Document clearly; use demo-only verified seller if KYC cannot complete |
| Only card payments in sandbox | No Apple Pay / alternative methods | Use test cards in README |
| Apps & messaging unsupported | N/A for CreatorJobs | — |

## Documentation / SDK mismatches

| Topic | Docs say | SDK says | Resolution |
|-------|----------|----------|------------|
| Verification list param | `account_id` (biz tag) | `payout_account_id` | Use payout account retrieve after onboarding |
| Checkout `company_id` | Some guides top-level | Inline under `plan.company_id` | Use `plan.company_id` per SDK types |
| Purchase URL | Full URL in examples | Often relative path | Prefix with sandbox/production Whop frontend base |
| Webhook secret field | `webhook_secret` or `secret` in community examples | `webhook_secret` on `WebhookCreateResponse` | Use `webhook_secret` |

## Unsupported / not implemented

| Capability | Notes |
|------------|-------|
| Programmatic withdrawals | Hosted payout portal only (core scope) |
| Partial refunds | Full refund only: `paid → refunded` |
| Embedded checkout / KYC | Stretch goals |
| Real authentication | Cookie role switcher for demo |

## Demo-only seller

If sandbox KYC cannot be completed, SQL seed may set `kyc_status = 'verified'` with seller name containing `[DEMO ONLY — not Whop verified]`. This is **not** Whop verification and must never be presented as such.
