#!/usr/bin/env python3
"""Parse JUnit XML into the canonical test-run schema (reference/schemas.md).

JUnit XML is the universal CI report format (Jenkins, GitHub Actions, GitLab,
pytest, Maven Surefire, Playwright). This emits one record per (test, build)
plus explicit gap records for missing periods — rule A-4: a chart may never
bridge a gap it was not told about.

Input (one or more paths, mixed freely):
  file.xml          one build; build_id = file stem
  directory/        subdirectories containing XML = one build each
                    (build_id = subdirectory name); a flat directory of XML
                    files = ONE build (surefire writes one file per class)
  archive.tgz       same rules applied to the archive's contents; nested
                    .tgz members (FlakeFlagger rerun layout) = one build each

Output: JSON {"runs": [...], "gaps": [...]} to --out or stdout;
a per-build summary goes to stderr.

Timestamps come from the <testsuite timestamp="..."> attribute when present;
when the source carries none, timestamp is null — never fabricated — and gap
detection is skipped (reported on stderr). Gaps are intervals between
consecutive builds longer than --gap-days (default: 2x the median spacing,
minimum 2 days).

Usage:
  parse_junit.py results/ --out runs.json
  parse_junit.py build1.xml build2.xml --gap-days 3
"""
import argparse
import json
import re
import sys
import tarfile
from datetime import date, datetime, timedelta
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET


def parse_xml(data, build_id):
    """Yield run records from one JUnit XML document (bytes)."""
    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        print("skipping unparseable XML in %s: %s" % (build_id, e), file=sys.stderr)
        return
    suites = [root] if root.tag == "testsuite" else root.iter("testsuite")
    for suite in suites:
        suite_ts = parse_timestamp(suite.get("timestamp"))
        for case in suite.iter("testcase"):
            cls = case.get("classname") or suite.get("name") or "unknown"
            name = case.get("name") or "unknown"
            if case.find("skipped") is not None:
                status = "skip"
            elif case.find("error") is not None:
                status = "error"
            elif case.find("failure") is not None:
                status = "fail"
            else:
                status = "pass"
            parts = cls.split(".")
            yield {
                "test_id": "%s#%s" % (cls, name),
                "build_id": build_id,
                "timestamp": suite_ts,
                "status": status,
                "duration_ms": int(float(case.get("time") or 0) * 1000),
                "module": parts[-2] if len(parts) > 1 else cls,
            }


def parse_timestamp(raw):
    """JUnit timestamp attribute -> ISO 8601 string, or None. Never invents one."""
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def is_junit_name(name):
    return name.endswith(".xml")


def collect_builds(paths):
    """Resolve the inputs to {build_id: [xml_bytes, ...]}."""
    builds = {}

    def add(build_id, data):
        builds.setdefault(build_id, []).append(data)

    def walk_dir(d):
        subdirs = [s for s in sorted(d.iterdir())
                   if s.is_dir() and any(is_junit_name(f.name) for f in s.rglob("*.xml"))]
        if subdirs:
            for s in subdirs:
                for f in sorted(s.rglob("*.xml")):
                    add(s.name, f.read_bytes())
        else:
            for f in sorted(d.rglob("*.xml")):
                add(d.name, f.read_bytes())

    def walk_tar(tf, label):
        members = tf.getmembers()
        inner_tgz = [m for m in members if m.name.endswith((".tgz", ".tar.gz"))]
        if inner_tgz:                        # FlakeFlagger layout: one archive per run
            for m in sorted(inner_tgz, key=lambda m: natural_key(m.name)):
                inner = tarfile.open(fileobj=BytesIO(tf.extractfile(m).read()), mode="r:gz")
                bid = Path(m.name).stem.replace(".tar", "")
                for f in inner.getmembers():
                    if is_junit_name(f.name):
                        add(bid, inner.extractfile(f).read())
            return
        xmls = [m for m in members if is_junit_name(m.name)]
        top = {Path(m.name).parts[0] for m in xmls if len(Path(m.name).parts) > 1}
        for m in xmls:
            parts = Path(m.name).parts
            bid = parts[0] if len(top) > 1 and len(parts) > 1 else label
            add(bid, tf.extractfile(m).read())

    for p in paths:
        p = Path(p)
        if not p.exists():
            sys.exit("input not found: %s" % p)
        if p.is_dir():
            walk_dir(p)
        elif p.name.endswith((".tgz", ".tar.gz")):
            with tarfile.open(p, "r:gz") as tf:
                walk_tar(tf, p.name.split(".")[0])
        else:
            add(p.stem, p.read_bytes())
    return builds


def natural_key(s):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]


def find_gaps(runs, gap_days):
    """Gap records between consecutive builds, from testsuite timestamps."""
    days_by_build = {}
    for r in runs:
        if r["timestamp"]:
            d = date.fromisoformat(r["timestamp"][:10])
            days_by_build[r["build_id"]] = min(d, days_by_build.get(r["build_id"], d))
    if len(days_by_build) < 3:
        print("gap detection skipped: %d timestamped build(s); need 3+"
              % len(days_by_build), file=sys.stderr)
        return []
    days = sorted(set(days_by_build.values()))
    spacings = sorted((b - a).days for a, b in zip(days, days[1:]))
    threshold = gap_days if gap_days else max(2, 2 * spacings[len(spacings) // 2])
    gaps = []
    for a, b in zip(days, days[1:]):
        missing = (b - a).days - 1
        if missing >= threshold:
            gaps.append({
                "gap": True,
                "from": (a + timedelta(days=1)).isoformat(),
                "to": (b - timedelta(days=1)).isoformat(),
                "reason": "no builds for %d days; render as labeled gap, "
                          "never bridge (rule A-4)" % missing,
            })
    return gaps


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("inputs", nargs="+", help="XML files, directories, or .tgz archives")
    ap.add_argument("--out", "-o", help="output JSON path (default: stdout)")
    ap.add_argument("--gap-days", type=int, default=0,
                    help="min missing days that count as a gap (default: 2x median spacing)")
    args = ap.parse_args()

    builds = collect_builds(args.inputs)
    if not builds:
        sys.exit("no JUnit XML found in: %s" % ", ".join(args.inputs))

    runs = []
    for bid in sorted(builds, key=natural_key):
        for data in builds[bid]:
            runs.extend(parse_xml(data, bid))
    gaps = find_gaps(runs, args.gap_days)

    out = json.dumps({"runs": runs, "gaps": gaps}, indent=1)
    if args.out:
        Path(args.out).write_text(out)
    else:
        print(out)

    n_tests = len({r["test_id"] for r in runs})
    n_fail = sum(r["status"] in ("fail", "error") for r in runs)
    print("builds: %d · tests: %d · records: %d · fail/error: %d · gaps: %d"
          % (len(builds), n_tests, len(runs), n_fail, len(gaps)), file=sys.stderr)
    if args.out:
        print("wrote %s" % args.out, file=sys.stderr)


if __name__ == "__main__":
    main()
