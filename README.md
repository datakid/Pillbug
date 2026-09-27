# Pillbug · Pharmacy Inventory

A local-first pharmacy inventory demo built with vanilla HTML, CSS and JavaScript. It has no framework and no backend.

## Features
- **Overview**: products, stock value at cost, 30-day revenue and margin, value at risk of expiring, a 14-day dispensing chart, items to reorder, items expiring soon, and recent activity
- **Inventory**: search by name, generic name, SKU or lot. Filter by category and by status (low / out / expiring). Sort by any column. Export to CSV. Click a product to open a detail drawer that shows its batches and history, with edit, delete, receive, adjust and dispose actions
- **Receive**: stock is stored in batches (lot, expiry, quantity, cost, supplier, reference). The same lot and expiry received again is merged using a weighted average cost. Expired lots are rejected. The sell price can be updated
- **Dispense**: build an order with several products. Stock is always taken from the batch that expires first (FEFO). Expired stock is never dispensed. Quantities are checked against what is available
- **Ledger**: a full audit trail of stock received, dispensed, returned, adjusted and disposed. Filter by type, search text and date range. Shows summary totals. A dispensed item can be returned to stock. Export to CSV
- **Expiry**: tabs for Expired, ≤30 days, the warning window and All. Dispose one batch or dispose all expired batches in bulk. The sidebar shows a badge count
- **Settings**: Light, Dark or System theme; currency; expiry warning window; JSON backup export; import by drag-and-drop (merge or replace); reload sample data; erase all data

## Faster data entry (js/fields.js)
- Custom date fields with a calendar that matches the app theme. You can also type dates directly: `t`, `y`, `+2y`, `-3d`, `+6m`, `12/27` (end of that month for expiry dates), `dec 27`, `311227`, `2027-05-03`. A hint under the field shows how your text was read
- Quick-pick chips: +6 mo, +1 yr, +2 yr, +3 yr for expiry; Today and Yesterday for the received date
- Product field that searches as you type (name, generic name or SKU). Use the arrow keys and Enter, scan a SKU, or pick "Create …"
- Pressing Enter moves to the next field on the Receive form. Pressing Enter in the Dispense search adds the top match to the order
- Ledger date presets: Today, 7d, 30d, 90d, All

## Import / export (js/importer.js, SheetJS loaded only when needed from js/vendor)
- Import CSV, TSV, XLSX, XLS or ODS files. If a file has several sheets, you choose one. The header row is detected automatically, and columns are matched to fields automatically (you can change the matches). A preview and a summary show what will be imported, and rows that can't be used are listed with the reason. You can choose whether existing products are updated or left alone. Excel date numbers and both European and US number formats are understood
- Downloadable CSV import template
- Export an Excel workbook with three sheets (Products, Batches, Ledger), a JSON backup, CSV files, and a purchase list of items to reorder

## Routes
`#/dashboard`, `#/inventory`, `#/receive`, `#/dispense`, `#/history`, `#/expiry`, `#/settings`

## Data
Everything is stored in `localStorage` under the key `pillbug.v1` as `{version, drugs[], batches[], tx[], settings}`.
- drug: id, name, generic, strength, form, category, sku, unit, price, reorder, notes
- batch: id, drugId, lot, expiry, qty, cost, supplier, received
- tx: id, type (in/out/return/adjust/dispose), date, drugId, drugName, batchId, lot, qty, unitCost, unitPrice, ref, note, reversed
