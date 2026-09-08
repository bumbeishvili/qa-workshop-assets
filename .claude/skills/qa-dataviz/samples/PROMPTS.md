# Report prompts for the shipped samples

The three-block prompt from SKILL.md, filled in per sample. With the
skill loaded, each one is the whole prompt. The pages they produced:
[runs report](https://qa.davidb.dev/report/runs-report.html),
[coverage report](https://qa.davidb.dev/report/coverage-report.html).
`runs_real.csv` is `runs_real.json` as CSV, served at
[qa.davidb.dev/samples/runs_real.csv](https://qa.davidb.dev/samples/runs_real.csv).

## runs_real.csv

```
Here is runs_real.csv. Each row is one test execution.
Columns: test_id, build_id, status, duration_ms, module.
3,560 rows, 40 builds, 89 rows per build, 86 tests.
Treat build_id as a category.

I checked the data. Use these numbers:
3 mongodb tests error twice in every build, 20 s each;
210 of the 240 errors land in 20.0-20.9 s.
They take 87% of the test time: a build runs 139 s
with them and 18 s without.
240 errors and 11 failures. Show them separately.
The doubled rows sit adjacent, 1 ms apart at the median.
84 of 86 tests never change status: 81 pass, 3 error.
deactivationTest fails 10 of 40 builds, 73 ms vs 72 ms.
persistedTimerTest fails once, in r05344.
11 builds hold a failure, never two in one.
Passing runs: median 14 ms, mean 220. Two Hello tests
hold 6.5% of all time.
275 rows record 0 ms and two record negative time.
Build totals stay between 134 and 150 s.

Make a one page report. One answer per chart title.
Answer: how much time errors and failures take,
which tests cause them, which are unstable,
and what the data itself records wrongly.
```

## coverage_real.json

```
Here is coverage_real.json. The root node commons-math holds
children: a flat list of 76 directories at every depth, each
with path, loc and covered_pct. Depth is the number of slashes
in path. A directory's loc includes its subdirectories, so
parents and children overlap; the root's 295,312 lines is the
sum of all 76 rows. Never add rows across depths. The 7 paths
without a slash are the only disjoint set: 68,463 lines at
75.7%. Work in absolute lines: covered = loc x covered_pct / 100.

I checked the data. Use these numbers:
commons-math-core is 0% over 9,377 lines, 56% of all
16,609 uncovered lines. 9,346 of them are one package,
core/jdkmath.
commons-math-examples is 0% too: 1,066 lines.
commons-math-legacy is 75% of the code, 51,095 lines
at 90%.

Make a one page report. One answer per chart title.
Answer: how much code is covered, which modules hold
the uncovered lines, which packages under them, and
what the file counts more than once.
```
