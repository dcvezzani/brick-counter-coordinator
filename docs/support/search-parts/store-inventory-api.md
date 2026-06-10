# Store inventory list API

> **Canonical doc:** [bricklink-store-inventory-search.md](../../bricklink-store-inventory-search.md) — coordinator-oriented; expanded from this note.

**Used by:** Lot form part search (`PartSearchCombobox` → `GET /bricklink/inventory-search`); ported from extension `store-inventory-list.js` / invXML modal.  
**Raw capture:** [`store-inventory-detail-list-query.md`](store-inventory-detail-list-query.md)  
**Extension reference:** `bricklink-chrome-extension/src/lib/store-inventory-list.js`

---

## 1. Endpoint

| Property | Value |
|----------|--------|
| URL | `https://www.bricklink.com/ajax/renovate/storeInventoryDetail/list.ajax` |
| Method | `POST` (GET with query string also observed; prefer POST for body length) |
| Credentials | Extension: `credentials: 'include'`. Coordinator: server `Cookie` header from `BRICKLINK_SESSION_COOKIE` ([ADR-0002](../../../adr/0002-bricklink-ajax-only-no-iframes.md)) |
| Content-Type | `application/x-www-form-urlencoded; charset=UTF-8` |
| Headers | `X-Requested-With: XMLHttpRequest`, `Accept: */*` |

Session cookies must be present (user logged into BrickLink in the same browser).

---

## 2. Response shape

```ts
{
  returnCode: number;      // 0 = success
  returnMessage: string;   // e.g. "SUCC"
  inventoryList: InventoryRow[];
  totalInvRes: number;
  curPage: number;
  // ... other metadata
}
```

**Failure:** Non-zero `returnCode`, empty body, or HTTP error → treat as no lots; surface optional row error in UI (v1: silent empty, keep spinner removed).

---

## 3. Query modes

### 3.1 By part number (and condition)

Use when `partId` is set and `storeInventoryLotId` is empty.

| Parameter | Value |
|-----------|--------|
| `strQuery` | Part ID (e.g. `3001`) |
| `strInvNew` | `U` or `N` from row condition |
| `strCatType` | `P` (parts only v1) |
| `n4InvID` | `-1` |
| `n4ColorID` | `-1` (server filter unreliable — **always client-filter**) |

All other parameters: use defaults from [`store-inventory-detail-list-query.md`](store-inventory-detail-list-query.md) curl body.

**Client filter after response:**

```js
rows.filter((r) => !colorId || r.ColorID === Number(colorId))
```

When `colorId` omitted, use full list (first row drives part-only thumbnail/description).

### 3.2 By store inventory lot ID

Use when `storeInventoryLotId` is set.

| Parameter | Value |
|-----------|--------|
| `n4InvID` | Lot ID (integer) |
| `strQuery` | `` (empty string) |
| `strCatType` | `P` |

Expect 0 or 1 primary match; still map through simplified lot mapper.

---

## 4. Default parameter block

Copy baseline from curl in `store-inventory-detail-list-query.md`. Keys that must change per request:

| Key | Part search | Lot ID search |
|-----|-------------|---------------|
| `strQuery` | part ID | `` |
| `strInvNew` | condition | from returned row or `-1` / omit? **Use row condition when part search; for lot ID search use `U` default or leave `U` from baseline** |
| `n4InvID` | `-1` | lot ID |
| `strCatType` | `P` | `P` |

**Lot ID search:** Use same baseline; set `n4InvID` to lot id, `strQuery` empty. Condition filter not applied server-side; returned row defines part/color/condition.

---

## 5. Simplified lot mapper

Port `toSimplifiedLot()` from `bricklink-chrome-extension/src/lib/store-inventory-list.js` — includes `condition`, `retain`, `stockroom`, and prefers `invDescription` over catalog color+name fallback. Full shape: [bricklink-store-inventory-search.md](../../bricklink-store-inventory-search.md#simplified-lot-mapper).

---

## 6. Matching rules (product logic)

| Scenario | API call | Pick row |
|----------|----------|----------|
| Auto: part + color + condition | 3.1 | First where `ColorID === colorId` and `invNew === condition` |
| Auto: part + condition (no color) | 3.1 | First where `invNew === condition` |
| Auto: part only | 3.1 | First in list |
| Auto: lot ID | 3.2 | First in list |
| Load with color | 3.1 + filter | First color match |
| Load without color | 3.1 | First in list |
| Duplicate check | Same as auto | `existsInStoreInventory = inventoryList.length > 0` after filter |

---

## 7. Debounce, cancel, concurrency

| Rule | Value |
|------|--------|
| Debounce | **400 ms** after last change to triggering fields |
| Abort | `AbortController` per row; abort prior request when inputs change |
| Global cap | Max **3** in-flight requests extension-wide |

---

## 8. Pagination

Sample responses include `totalInvRes` and `curPage`. v1 uses **page 1 only** (`pg=1`). If `totalInvRes` > returned `inventoryList.length`, duplicate warning may be under-inclusive — acceptable v1 limitation; document in smoke tests.

---

## 9. Security & privacy

- **Coordinator:** Session cookie server-only; browser never sees BrickLink credentials.
- **Extension (reference):** No credentials in extension storage; relies on BrickLink session in browser.
- No iframe-based lookup ([ADR-0002](../../../adr/0002-bricklink-ajax-only-no-iframes.md)).

---

## 10. Tests

| Case | Assert |
|------|--------|
| Mapper | Fixture JSON row → all simplified fields |
| Color filter | Two colors in list → filter returns one |
| `normalizeImageUrl` | `//img...` → `https://img...` |
| URL builder | Part search params include `strQuery`, `strInvNew` |

Fixture: truncated `inventoryList` from `store-inventory-detail-list-query.md` response section.
