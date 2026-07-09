# CreatorJobs — Whop API Notes

Verified against `@whop/sdk` **v0.0.40** and Whop docs (2026-07-01 API version date).

Same sandbox Company API key is used for Experimental and Stable endpoints per CreatorJobs integration policy.

## Authentication

| Item | Verified value |
|------|----------------|
| Production API base URL | `https://api.whop.com/api/v1` |
| Sandbox API base URL | `https://sandbox-api.whop.com/api/v1` |
| Authorization | `Authorization: Bearer <WHOP_API_KEY>` |
| SDK client | `new Whop({ apiKey, baseURL, webhookKey })` |
| Platform identity read | `client.accounts.me()` → returns platform `Account` with `id` (`biz_…`) |
| `401` | Missing/invalid API key or wrong environment (sandbox key against production) |
| `403` | Valid auth but missing permission scope for the endpoint |

### Required scopes (representative)

| Capability | Scope |
|------------|-------|
| Child company create | `company:create`, `company:basic:read` |
| Checkout | `checkout_configuration:create`, `plan:create`, … |
| Webhook management | `developer:manage_webhook` |
| Payout account read | `payout:account:read` |
| Payout methods | `payout:destination:read` |
| Payment read | `payment:basic:read` |

## Connected accounts (child companies)

### Endpoint used: **Stable** `POST /companies` via `client.companies.create`

Experimental `client.accounts.create` creates connected accounts implicitly when called with a business API key but does **not** accept `parent_company_id` or `title` in SDK types — we use Stable `companies.create` for explicit platform child companies.

### Request fields

```typescript
await client.companies.create({
  title: string,              // required
  email: string,              // required when parent_company_id set
  parent_company_id: string,  // platform company biz_…
  metadata: { internal_seller_id: string, ... },
});
```

### Response fields

| Field | Format |
|-------|--------|
| `id` | `biz_…` child company ID |
| `metadata` | key-value object |
| `title` | display name |

### List / reconcile

`client.companies.list({ parent_company_id })` — find existing child by metadata.

## Checkout (direct charge + application fee)

### Endpoint: **Stable** `client.checkoutConfigurations.create`

SDK exposes one checkout configuration resource; no separate Experimental client method in `@whop/sdk` v0.0.40. Experimental beta docs mirror the same shape.

### Request shape (inline plan on seller company)

```typescript
await client.checkoutConfigurations.create({
  mode: "payment",
  metadata: { order_id, listing_id, seller_id },  // string values
  redirect_url: "https://…/order/{orderId}",
  plan: {
    company_id: sellerWhopCompanyId,   // seller child biz_…
    currency: "usd",
    plan_type: "one_time",
    initial_price: 49.99,              // dollars, not cents
    application_fee_amount: 4.99,        // dollars; platform fee
    title: "Listing title",
    product: {
      external_identifier: listingId,
      title: "Listing title",
    },
  },
});
```

| Field | Location | Notes |
|-------|----------|-------|
| Seller company | `plan.company_id` | Direct charge on connected account |
| Price | `plan.initial_price` | **Dollars** (e.g. 10.00) |
| Application fee | `plan.application_fee_amount` | **Dollars**; must be `< initial_price` |
| Metadata | top-level `metadata` | Inherited by payment |
| Hosted URL | response `purchase_url` | Often relative `/checkout/plan_…?session=…` — prefix with `https://sandbox.whop.com` in sandbox |
| Checkout ID | response `id` | Store as `whop_checkout_config_id` |
| Plan ID | response `plan.id` | Store as `whop_plan_id` |

## Webhooks

### Endpoint: **Stable** `client.webhooks.create`

No Experimental webhook create in SDK.

### Registration

```typescript
await client.webhooks.create({
  url: `${APP_URL}/api/webhooks/whop`,
  resource_id: platformCompanyId,
  child_resource_events: true,  // REQUIRED for seller child payments
  events: [
    "payment.succeeded",
    "payment.failed",
    "verification.succeeded",
    "identity_profile.approved",
    "payout_method.created",
    "refund.created",
  ],
});
```

### Response

| Field | Notes |
|-------|-------|
| `id` | `hook_…` |
| `webhook_secret` | Returned once at creation; Standard Webhooks format (base64) |

### Signature verification

- Spec: [Standard Webhooks](https://www.standardwebhooks.com)
- Headers: `webhook-id`, `webhook-timestamp`, `webhook-signature` (`v1,<base64-hmac>`)
- SDK: `client.webhooks.unwrap(rawBody, { headers, key: WHOP_WEBHOOK_SECRET })`
- Secret: pass as configured in dashboard / create response; SDK handles base64 decode
- **Must use raw request body** before JSON parse

### Idempotency key

Primary: HTTP header `webhook-id`  
Fallback: event body field `id` on webhook payload

### Payment events

| Event | Use |
|-------|-----|
| `payment.succeeded` | `pending_payment → paid` |
| `payment.failed` | `pending_payment → failed` |
| `refund.created` | `paid → refunded` |

### Verification / payout events

| Event | Use |
|-------|-----|
| `verification.succeeded` | Update seller KYC |
| `identity_profile.approved` | Update seller KYC |
| `payout_method.created` | `payout_method_linked = true` |
| `payout_account.status_updated` | Payout eligibility sync |

### `child_resource_events`

When `true` on a platform company webhook, events from **child companies (sub-merchants)** are delivered. Without this, marketplace payments on seller companies are silent — no webhooks.

## Seller financial status

### KYC / verification

**Stable** payout account path (SDK):

1. `client.payoutAccounts.retrieve(payoutAccountId)` → `latest_verification.status`, `status`
2. Verification statuses include: `approved`, `verified`, `pending`, `processing`, `requires_input`, `declined`, `action_required`, …

Map to CreatorJobs:

| Whop status | CreatorJobs `kyc_status` |
|-------------|--------------------------|
| `approved`, `verified` | `verified` |
| others | `unverified` (or `pending` when in-flight) |

Hosted onboarding: `client.accountLinks.create({ use_case: "account_onboarding", company_id, return_url, refresh_url })`

### Payout method

`client.payoutMethods.list({ company_id: sellerBizId })` — `payout_method_linked = data.length > 0`

### Payout eligibility

`client.payoutAccounts.retrieve(id).status`:

| Whop `status` | CreatorJobs `payout_eligible` |
|---------------|----------------------------|
| `connected` | `true` |
| `disabled`, `action_required`, `pending_verification`, `verification_failed`, `not_started` | `false` |

Do **not** infer eligibility from KYC alone.

### Hosted payout portal

`client.accountLinks.create({ use_case: "payouts_portal", company_id, return_url, refresh_url })`

## Payment reconciliation

`client.payments.retrieve(paymentId)` — compare `substatus` / payment state and `metadata.order_id` with CreatorJobs order.

## Sandbox test cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| Any future expiry, any CVC, any billing address | — |

Sandbox frontend: `https://sandbox.whop.com`

## SDK version

Installed: `@whop/sdk@0.0.40` (do not pin older tutorial versions).
