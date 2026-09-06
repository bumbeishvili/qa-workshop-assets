# Checked findings for the sample data

Block 2 of the report prompt ("I checked the data. Use these numbers:")
pre-computed for the shipped samples. Every line is computable from the
file it names; the computation is stated so it can be re-run.

## runs_real — 3,560 test executions (runs_real.json / runs_real.csv)

- Every build is 89 rows over the same 86 tests; the test_id set is
  identical in all 40 builds.
- 3,560 executions: 3,309 pass, 240 error, 11 fail at 55–99 ms.
- The 240 errors are 3 MongodbPersistenceTest tests, in all 40 builds,
  recorded twice per build (the only tests with 80 rows instead of 40).
- The doubled rows sit adjacent, 1 ms apart at the median (max 13 ms).
- 210 of the 240 errors run 20.0–20.9 s; the extremes are 18.9 and 25.3.
- Those 3 tests take 87% of the test time: 4,846,979 of 5,576,661 ms.
- A build without them is 18 s of testing; with them, 139 s.
- 84 of 86 tests never change status: 81 always pass, 3 always error.
- 10 of the 11 failures are one test, deactivationTest, in 10 builds
  from r02570 to r09547.
- It fails in 73 ms and passes in 72 (medians).
- The 11th failure is persistedTimerTest, once, in r05344.
- 11 builds hold a failure; the most in any one build is one.
- Passing runs: median 14 ms, mean 220 — HelloTest#test and
  HelloTcpTest#test hold 6.5% of all time (363,913 ms).
- 275 rows record 0 ms, all passes; 172 sit in concurrent.test.
- Two rows record negative time: −324 and −511 ms, both passes of
  ensureNoObjectsAreCreatedClientTest.
- Build totals stay between 134.0 and 150.2 s.
- No column orders the builds in time. Treat build_id as a category.

## coverage_real.json — 76 directories

- The root row, 295,312 lines at 80%, is the exact sum of all 76
  overlapping rows; every directory is counted at every depth.
- The 7 top-level modules are the only disjoint partition: 68,463 lines
  at 75.7%. Covered lines = Σ loc × covered_pct / 100.
- commons-math-core is 0% over 9,377 lines — 56% of all 16,609 uncovered
  lines. 9,346 of them are one package, core/jdkmath.
- commons-math-examples is 0% too: 1,066 lines.
- commons-math-legacy is 75% of the code (51,095 lines) at 90%.

defects_jira.json has no checked-findings block yet; run workflow step 2
on it before prompting.
