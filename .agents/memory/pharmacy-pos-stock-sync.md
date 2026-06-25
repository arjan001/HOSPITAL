---
name: Pharmacy POS stock sync
description: How branch POS sales update the shared catalog stock ledger.
---

## Model

- **Catalog source of truth:** `cms_docs` key `products` (served via `GET /api/v2/products`).
- **Branch POS** (`pharmacy-pos.tsx`) reads the same catalog as the online shop.
- There is **no separate per-branch stock table** yet — branch sales decrement the **main catalog** `stockCount` / `inStock` fields.

## When stock deducts

On `POST /api/v2/pharmacy/pos/transactions` with `status: "paid"`:

1. Transaction is persisted to `pos_transactions`.
2. `deductCatalogProductStock()` runs for each line `{ productId, qty }`.
3. Products with insufficient `stockCount` are skipped (sale still records; ops should reconcile).

## Verify (manual)

1. Admin → Products — note `stockCount` for a SKU.
2. Admin → Pharmacy → POS — sell that product (cash, paid).
3. Refresh Products admin and storefront PDP — `stockCount` should drop by qty sold.
4. Online shop should show **Out of stock** when `stockCount` reaches 0.

## Future

Per-branch ledgers (`pharmacy_branch_stock`) can layer on top without changing POS UX — deduct branch first, optionally mirror to central catalog for e-commerce availability.
