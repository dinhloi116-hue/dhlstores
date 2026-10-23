# Batch inventory export v0.18

Goal: scan multiple saved profiles/categories, cache each completed official Sapo inventory row set locally, then export one combined Sapo inventory workbook.

Safety rules:
- Do not modify matching/scanner cores.
- Cache is keyed by profile id and replaces only that profile's previous pending scan.
- Combined export rejects mixed Sapo branches.
- Combined export deduplicates by SKU and refuses conflicting duplicate SKU rows.
- Pending cache survives panel/tab changes until user exports or clears it.
- Stock history snapshots remain independent.
