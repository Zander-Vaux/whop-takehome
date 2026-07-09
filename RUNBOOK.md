# CreatorJobs Support Runbook

Operations frame: **Observe → Diagnose → Remediate**

Dashboard: `/admin` (switch role to Admin)

---

## Scenario 1: Buyer paid, but order remains pending

| Field | Detail |
|-------|--------|
| Issue type | Payment / webhook delivery |
| Customer response | “We’re confirming your payment. You’ll receive a receipt shortly.” |
| Urgency | High if paid > 5 minutes |
| Escalation | Whop shows succeeded payment, config correct, no webhook/explained delivery failure |

### Internal action

1. `/admin` → find order → note state, Whop payment ID, checkout config ID
2. Confirm Whop dashboard shows payment succeeded for seller child company
3. Webhooks section: any `payment.succeeded`? status `failed`?
4. Verify production/tunnel URL matches registered webhook
5. Confirm `child_resource_events: true` on platform webhook
6. Check `WHOP_WEBHOOK_SECRET` matches registration
7. Use **Re-check with Whop** on order
8. If event failed, **Retry** after fixing root cause

### Evidence to collect

Order ID, checkout configuration ID, payment ID, webhook message ID (`webhook-id`), timestamps, HTTP status, processing error, Whop request ID

### SQL

```sql
select * from orders where id = '<order_id>';
select * from webhook_events where payload->>'type' = 'payment.succeeded' order by received_at desc limit 10;
```

### Whop evidence

`payments.retrieve(pay_…)`, webhook delivery logs in dashboard

---

## Scenario 2: Seller completed onboarding but cannot withdraw

| Field | Detail |
|-------|--------|
| Issue type | Payout readiness |
| Customer response | Explain which requirement is incomplete (KYC, payout method, or eligibility). |
| Urgency | Medium |
| Escalation | Whop reports all requirements complete but hosted payout still blocked |

### Internal action

1. Seller must click **Check status** / **Sync from Whop** — redirect ≠ verified
2. `/admin` or `/sell/payouts`: three indicators separately
3. Open hosted payout portal fresh link
4. Check webhooks: `identity_profile.approved`, `payout_method.created`, `payout_account.status_updated`
5. Document sandbox limitation if applicable

### Evidence

Seller `biz_…` ID, verification/payout API responses, relevant webhook rows, timestamps

### SQL

```sql
select kyc_status, payout_method_linked, payout_eligible, whop_company_id
from sellers where id = '<seller_id>';
```

---

## Scenario 3: Connected-account calls return 401

| Field | Detail |
|-------|--------|
| Issue type | Authentication |
| Customer response | “We’re investigating a configuration issue.” |
| Urgency | High — blocks onboarding/checkout |
| Escalation | Reproduced with new correctly scoped platform key on correct environment |

### Internal action

1. Confirm `WHOP_API_KEY` present (never log full key)
2. Sandbox key + `baseURL` sandbox-api.whop.com
3. Distinguish **401** (auth/env) vs **403** (missing scope)
4. Confirm platform key used, correct `WHOP_PLATFORM_COMPANY_ID`
5. Run `npm run preflight`

### Evidence

Base URL, endpoint, HTTP status, Whop request ID, key prefix/last4, environment, target company ID

---

## Scenario 4: Operations needs one dashboard

| Field | Detail |
|-------|--------|
| Issue type | Observability |
| Customer response | Use admin view internally; customer gets targeted status from scenarios 1–2 |
| Urgency | Low for setup; high during incident |

### Dashboard (`/admin`)

- Orders: buyer, listing, seller, amounts, state, Whop payment ID, seller KYC/payout columns
- Webhooks: last 50, failed highlighted, payload expand, retry
- **Re-check with Whop** for reconciliation
- Filter orders by state

Routine mismatches should not require engineering if reconciliation succeeds.

---

## Idempotency testing

```bash
npm run test:webhook-idempotency
```

Uses stored fixture + duplicate insert guard on `whop_message_id`.
