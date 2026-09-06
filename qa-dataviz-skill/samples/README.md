# Sample data — provenance

Real data is the default for everything hands-on. Synthetic exists only in
`synthetic/`, for demos that need a guaranteed, findable pathology, and is
introduced as synthetic wherever it appears. Full provenance detail lives in
the workshop repository's `samples/README.md`; this is the short version.

## Real (fetched, not generated)

| File | What it is | Source |
|---|---|---|
| `runs_real.json` | Real test executions of [orbit](https://github.com/orbit/orbit): 86 tests × 40 real runs, parsed from raw surefire/JUnit XML. Contains a genuinely ~25%-flaky test and a real 3-test co-failure cluster (MongoDB unavailable). The original reports carry no wall-clock time, so the file has no timestamp column and none was fabricated; `build_id` is a category. | FlakeFlagger raw reruns, [Zenodo 4450723](https://zenodo.org/records/4450723) |
| `defects_jira.json` | 300 real Apache HADOOP issues with real status-transition changelogs, mapped to the defect schema. | [issues.apache.org](https://issues.apache.org/jira) REST API |
| `coverage_real.json` | Real per-directory LOC + line coverage for Apache Commons Math (76 dirs, ~295k LOC). Well covered overall (~80%) with a few weak spots — realistic, less dramatic than the fixture. | [SonarCloud public API](https://sonarcloud.io) |

## Synthetic (generated, clearly labeled)

Produced by `scripts/make_fixtures.py` — deterministic, seed 42,
self-checking. Each planted pathology is invisible in the default chart and
unmissable in the correct one:

| File | Planted pathologies |
|---|---|
| `synthetic/runs_flaky.json` | 20 tests × 30 builds: 3 flaky tests (rates 0.2 / 0.35 / 0.5), a regression failing from build 20 on, one one-off failure |
| `synthetic/synthetic_ci.json` | 120 tests × 30 builds: 80-test slow cluster migrating 1 s → 8 s, 5-day CI gap with explicit gap records, two co-failure clusters, coverage tree with a 5,400-line module at 12% (~74% overall) |
| `synthetic/defects_jira.json` (after regeneration) | intake outpacing resolution for the last 4 weeks, 47 open at end, 4 Criticals open 90+ days |
