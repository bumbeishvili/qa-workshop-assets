#!/usr/bin/env python3
"""Generate the workshop's synthetic QA fixtures (deterministic, seed=42).

Planted pathologies — each invisible in the default chart, unmissable in the
correct one (workshop report §7):
  runs_flaky.json    3 flaky tests (0.2/0.35/0.5), regression @ build 20, one-off
  synthetic_ci.json  80-test slow cluster (1s -> 8s), 5-day CI gap (explicit
                     gap records), 2 co-failure clusters, background noise,
                     coverage tree with a 5,400-line module at 12% (~74% overall)
  defects_jira.json  diverging intake vs. resolution (last 4 weeks),
                     47 open at end, 4 Criticals open 90+ days

Schemas match report §5.1 exactly.
"""
import json
import random
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

rng = random.Random(42)
# synthetic output stays in samples/synthetic/ — samples/ root holds real data
# (samples/defects_jira.json is real HADOOP issues; never overwrite it)
OUT = Path(__file__).resolve().parent.parent / "samples" / "synthetic"
OUT.mkdir(parents=True, exist_ok=True)

END = date(2026, 8, 16)                     # "today" for the fixture
GAP_FROM, GAP_TO = date(2026, 7, 28), date(2026, 8, 1)   # 5-day CI outage

# 30 nightly builds ending at END, skipping the outage window
build_days = []
d = END
while len(build_days) < 30:
    if not (GAP_FROM <= d <= GAP_TO):
        build_days.append(d)
    d -= timedelta(days=1)
build_days.reverse()
BUILDS = [("b%04d" % (2012 + i), day) for i, day in enumerate(build_days)]


def ts(day, test_idx):
    t = datetime(day.year, day.month, day.day, 3, 2, tzinfo=timezone.utc)
    return (t + timedelta(seconds=44 + test_idx * 3)).isoformat().replace("+00:00", "Z")


def run(test_id, module, build_id, day, idx, status, dur):
    return {"test_id": test_id, "build_id": build_id, "timestamp": ts(day, idx),
            "status": status, "duration_ms": int(dur), "module": module}


# ---------------------------------------------------------------- runs_flaky
# The centerpiece dataset (Fig 9): 20 tests x 30 builds.
FLAKY = {"t05": 0.35, "t12": 0.50, "t18": 0.20}
REGRESSION, REGRESSION_AT = "t09", 19        # 0-based: fails from build 20 on
ONE_OFF, ONE_OFF_AT = "t15", 6
MODULES20 = ["billing", "auth", "payments", "sync", "api"]

# exact flaky fail-build sets: round(rate*30) builds each, so measured == planted
flaky_fail_builds = {tid: set(rng.sample(range(len(BUILDS)), round(r * len(BUILDS))))
                     for tid, r in FLAKY.items()}

flaky_runs = []
for i in range(1, 21):
    tid = "t%02d" % i
    module = MODULES20[i % len(MODULES20)]
    test_id = "%s.SmokeTest#%s" % (module, tid)
    for b, (build_id, day) in enumerate(BUILDS):
        if tid == REGRESSION:
            status = "fail" if b >= REGRESSION_AT else "pass"
        elif tid == ONE_OFF:
            status = "fail" if b == ONE_OFF_AT else "pass"
        elif tid in FLAKY:
            status = "fail" if b in flaky_fail_builds[tid] else "pass"
        else:
            status = "pass"
        dur = rng.lognormvariate(6.3, 0.35)          # ~450-900 ms
        flaky_runs.append(run(test_id, module, build_id, day, i, status, dur))

# ------------------------------------------------------------- synthetic_ci
# Full fixture: 120 tests x 30 builds.
#   c001-c080  slow cluster, duration migrates 1s -> 8s across builds
#   d101-d105  co-failure cluster A (shared DB fixture)
#   p109-p112  co-failure cluster B (payment sandbox)
#   n113-n140  background tests, 3% noise fail rate
CLUSTER_A_BUILDS = {4, 5, 11, 17, 26}
CLUSTER_B_BUILDS = {9, 15, 21, 28}
MODULES_CI = ["billing", "core", "api", "ui", "search", "notifications"]

ci_runs = []
for i in range(1, 81):                                # slow cluster
    module = MODULES_CI[i % len(MODULES_CI)]
    test_id = "%s.RegressionSuite#c%03d" % (module, i)
    for b, (build_id, day) in enumerate(BUILDS):
        frac = b / (len(BUILDS) - 1)
        dur = rng.gauss(1000 + 7000 * frac, 220)      # 1s -> 8s migration
        status = "fail" if rng.random() < 0.01 else "pass"
        ci_runs.append(run(test_id, module, build_id, day, i, status, max(dur, 120)))

for i in range(101, 106):                             # cluster A: DB fixture
    test_id = "db.FixtureSuite#d%03d" % i
    for b, (build_id, day) in enumerate(BUILDS):
        status = "fail" if b in CLUSTER_A_BUILDS else ("fail" if rng.random() < 0.02 else "pass")
        ci_runs.append(run(test_id, "db", build_id, day, i, status, rng.lognormvariate(6.6, 0.3)))

for i in range(109, 113):                             # cluster B: payment sandbox
    test_id = "payments.SandboxSuite#p%03d" % i
    for b, (build_id, day) in enumerate(BUILDS):
        status = "fail" if b in CLUSTER_B_BUILDS else ("fail" if rng.random() < 0.02 else "pass")
        ci_runs.append(run(test_id, "payments", build_id, day, i, status, rng.lognormvariate(6.9, 0.3)))

for i in range(113, 141):                             # background noise
    module = MODULES_CI[i % len(MODULES_CI)]
    test_id = "%s.UnitSuite#n%03d" % (module, i)
    for b, (build_id, day) in enumerate(BUILDS):
        status = "fail" if rng.random() < 0.05 else "pass"
        ci_runs.append(run(test_id, module, build_id, day, i, status, rng.lognormvariate(5.8, 0.4)))

gaps = [{"gap": True, "from": GAP_FROM.isoformat(), "to": GAP_TO.isoformat(),
         "reason": "CI outage — no builds ran; render as labeled gap, never bridge (rule A-4)"}]

coverage = {
    "path": "src", "loc": 100000, "covered_pct": 74, "children": [
        {"path": "src/core", "loc": 18000, "covered_pct": 88, "children": []},
        {"path": "src/ui", "loc": 16000, "covered_pct": 75, "children": []},
        {"path": "src/api", "loc": 14000, "covered_pct": 88, "children": []},
        {"path": "src/billing", "loc": 12500, "covered_pct": 46, "children": [
            {"path": "src/billing/invoicing", "loc": 7200, "covered_pct": 61, "children": []},
            {"path": "src/billing/tax", "loc": 5300, "covered_pct": 26, "children": []},
        ]},
        {"path": "src/payments", "loc": 9500, "covered_pct": 85, "children": []},
        {"path": "src/auth", "loc": 8000, "covered_pct": 90, "children": []},
        {"path": "src/infra", "loc": 6100, "covered_pct": 70, "children": []},
        {"path": "src/search", "loc": 6000, "covered_pct": 78, "children": []},
        {"path": "src/legacy-sync", "loc": 5400, "covered_pct": 12, "children": []},
        {"path": "src/notifications", "loc": 4500, "covered_pct": 83, "children": []},
    ],
}
# overall = weighted mean of leaves; recompute so the file is internally consistent
leaves = [c for c in coverage["children"]]
coverage["covered_pct"] = round(sum(c["loc"] * c["covered_pct"] for c in leaves)
                                / sum(c["loc"] for c in leaves))

# ------------------------------------------------------------ defects_jira
SEVERITIES = ["critical", "high", "medium", "low"]
SEV_W = [0.08, 0.22, 0.45, 0.25]
DEF_MODULES = ["billing", "core", "api", "ui", "payments", "auth", "legacy-sync"]
START = END - timedelta(days=120)

defects, n = [], 0

# plant the 4 ancient Criticals explicitly — the aging chart's whole story
for k, age in enumerate([112, 104, 97, 92]):
    opened = END - timedelta(days=age)
    defects.append({"defect_id": "PROJ-%04d" % (4101 + k), "severity": "critical",
                    "module": rng.choice(["legacy-sync", "billing"]),
                    "opened": opened.isoformat(), "closed": None,
                    "transitions": [{"to": "in_progress",
                                     "at": (opened + timedelta(days=3)).isoformat()}]})

day = START
while day <= END:
    age_days = (END - day).days
    intake = 1 + (1 if day.toordinal() % 3 == 0 else 0)
    if age_days <= 28:
        intake += 1                                   # diverging intake, last 4 weeks
    for _ in range(intake):
        n += 1
        sev = rng.choices(SEVERITIES, SEV_W)[0]
        lifetime = int(rng.lognormvariate(2.8, 0.9))  # median ~16 days
        closed = day + timedelta(days=lifetime)
        transitions = []
        if rng.random() < 0.65:
            transitions.append({"to": "in_progress",
                                "at": (day + timedelta(days=rng.randint(1, 5))).isoformat()})
        rec = {"defect_id": "PROJ-%04d" % (4200 + n), "severity": sev,
               "module": rng.choice(DEF_MODULES), "opened": day.isoformat(),
               "closed": closed.isoformat() if closed <= END else None,
               "transitions": transitions}
        if rec["closed"]:
            rec["transitions"].append({"to": "closed", "at": rec["closed"]})
        defects.append(rec)
    day += timedelta(days=1)

# exactly 4 Criticals open 90+ days: the planted ones stay open, any
# naturally generated old critical gets closed
PLANTED = {"PROJ-4101", "PROJ-4102", "PROJ-4103", "PROJ-4104"}
for x in defects:
    x["_age"] = (END - date.fromisoformat(x["opened"])).days
for x in defects:
    if (x["severity"] == "critical" and x["closed"] is None
            and x["_age"] >= 90 and x["defect_id"] not in PLANTED):
        x["closed"] = (date.fromisoformat(x["opened"]) + timedelta(days=40)).isoformat()
        x["transitions"].append({"to": "closed", "at": x["closed"]})

# tune open count to exactly 47 (never touching the planted criticals)
open_now = [x for x in defects if x["closed"] is None]
excess = len(open_now) - 47
adjustable = [x for x in open_now if x["defect_id"] not in PLANTED]
if excess > 0:
    for x in sorted(adjustable, key=lambda x: -x["_age"])[:excess]:
        x["closed"] = END.isoformat()
        x["transitions"].append({"to": "closed", "at": x["closed"]})
elif excess < 0:
    for x in [x for x in defects if x["closed"] is not None][:(-excess)]:
        x["closed"] = None
        x["transitions"] = [t for t in x["transitions"] if t["to"] != "closed"]
for x in defects:
    del x["_age"]

# ------------------------------------------------------------------- write
(OUT / "runs_flaky.json").write_text(json.dumps(flaky_runs, indent=1))
(OUT / "synthetic_ci.json").write_text(json.dumps(
    {"runs": ci_runs, "gaps": gaps, "coverage": coverage}, indent=1))
(OUT / "defects_jira.json").write_text(json.dumps(defects, indent=1))

# --------------------------------------------------------------- self-check
def rate(runs, tid):
    r = [x for x in runs if tid in x["test_id"]]
    return sum(x["status"] == "fail" for x in r) / len(r)

fails_flaky = sum(x["status"] == "fail" for x in flaky_runs)
fails_ci = sum(x["status"] == "fail" for x in ci_runs)
open_defects = [x for x in defects if x["closed"] is None]
crit_90 = [x for x in open_defects if x["severity"] == "critical"
           and (END - date.fromisoformat(x["opened"])).days >= 90]
slow = [x for x in ci_runs if "#c0" in x["test_id"]]
first_b, last_b = BUILDS[0][0], BUILDS[-1][0]
d_first = [x["duration_ms"] for x in slow if x["build_id"] == first_b]
d_last = [x["duration_ms"] for x in slow if x["build_id"] == last_b]

print("== fixture self-check ==")
print("builds: %d (%s..%s), CI gap %s..%s" % (len(BUILDS), first_b, last_b, GAP_FROM, GAP_TO))
print("pass rate — runs_flaky (the '94%%' dashboard set): %.1f%% · full CI: %.1f%%" % (
    100 * (1 - fails_flaky / len(flaky_runs)), 100 * (1 - fails_ci / len(ci_runs))))
for tid, want in sorted(FLAKY.items()):
    print("flaky %s: measured %.2f (planted %.2f)" % (tid, rate(flaky_runs, tid), want))
print("regression t09 fails from build index %d: %s" % (
    REGRESSION_AT, all(x["status"] == "fail" for x in flaky_runs
                       if "t09" in x["test_id"] and x["build_id"] >= BUILDS[REGRESSION_AT][0])))
print("slow cluster: %d tests, %.0fms -> %.0fms" % (
    80, sum(d_first) / len(d_first), sum(d_last) / len(d_last)))
print("coverage overall: %d%% · legacy-sync %d loc @ %d%%" % (
    coverage["covered_pct"], 5400, 12))
print("defects: %d total, %d open (target 47), criticals 90+d open: %d (target 4)" % (
    len(defects), len(open_defects), len(crit_90)))
