# Canonical data shapes

Three shapes cover the workshop's QA data. Parse any input to one of these
before charting (workflow step 2); never chart a raw export. All fields
lowercase snake_case; dates ISO 8601.

## Test run — one record per (test, build)

```jsonc
{
  "test_id": "billing.InvoiceTest#taxRounding",  // classname#method — unique per test
  "build_id": "b2041",                           // sortable; chronological when sorted
  "timestamp": "2026-08-01T03:12:44Z",           // null if the source has none — never fabricate
  "status": "pass",                              // pass | fail | skip | error
  "duration_ms": 812,
  "module": "billing"                            // grouping unit; usually the containing package
}
```

- `timestamp: null` is legal and honest (surefire reports of some eras carry
  no wall-clock time). When null, order by `build_id`.
- `fail` = assertion failed; `error` = test infrastructure threw. Both count
  as not-passing, but the distinction matters for co-failure analysis.

## Gap record — missing periods, emitted alongside runs

```jsonc
{
  "gap": true,
  "from": "2026-07-28",
  "to": "2026-08-01",
  "reason": "CI outage — no builds ran; render as labeled gap, never bridge (rule A-4)"
}
```

`scripts/parse_junit.py` emits these for missing build intervals when
timestamps allow it. Charts render gaps as labeled shaded bands and break
any line crossing them.

## Defect — transitions preserved (enables CFD + aging)

```jsonc
{
  "defect_id": "PROJ-4411",
  "severity": "critical",                        // critical | high | medium | low
  "module": "billing",
  "opened": "2026-05-02",
  "closed": null,                                // null = still open
  "transitions": [
    { "to": "in_progress", "at": "2026-05-04" },
    { "to": "closed",      "at": "2026-06-01" }
  ]
}
```

The `transitions` array is what makes a cumulative flow diagram possible;
an export with only current status cannot produce one. State that
limitation on the chart if bands are built from opened/closed alone.

## Coverage node — hierarchy for treemaps

```jsonc
{
  "path": "src/billing",
  "loc": 12500,                                  // lines of code = treemap area
  "covered_pct": 46,                             // 0–100 = treemap color
  "children": []                                 // nested nodes, same shape
}
```

Parent `covered_pct` should be the LOC-weighted mean of its children; if a
source reports otherwise, keep the source's number and note the mismatch.
