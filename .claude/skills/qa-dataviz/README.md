# qa-dataviz

An Agent Skill for QA data visualization: rules, schemas, scripts and
sample data for directing an AI to chart testing data with D3, and for
reviewing the charts, the claims around them and the prompts that
generate them. Built for the workshop "Data visualization with D3 and
AI" (QA conference, September 2026); works on its own.

## Install

```
git clone https://github.com/bumbeishvili/qa-workshop-assets
```

The repo is a project with this folder at `.claude/skills/qa-dataviz`;
open it in Claude Code and the skill is loaded. For another project, copy
the folder into its `.claude/skills/`, or into `~/.claude/skills/` for
every project. For a tool that is not Claude Code, paste SKILL.md into the
context and keep the linked files reachable; everything is plain markdown.

SKILL.md and its references are a few pages of text. Read them before
relying on them.

## What is in it

```
qa-dataviz/
├─ SKILL.md               workflow, hard rules, claims standard, the
│                         report-prompt shape, review mode, 22-point
│                         checklist, 7 task templates
├─ writing.md             prose rules for every word a reader sees
├─ reference/
│  ├─ schemas.md          canonical shapes: test run, gap, defect, coverage
│  ├─ chart-selection.md  QA question -> chart table + construction notes
│  ├─ anti-patterns.md    rules A-1..A-8 with detection steps and fixes
│  ├─ palette.md          fixed Okabe-Ito status/series/coverage colors
│  ├─ annotations.md      d3-annotation presets: which subject for which mark
│  └─ page-design.md      the report page's visual language and text budget
├─ d3/                    the reusable D3 Chart convention
│  ├─ README.md           chainable state, _add() enter/exit/update, sizing
│  ├─ template.js         start every new chart from this
│  ├─ examples/           line, sankey, map charts built on the template
│  └─ reference/          the article behind it + old->new cheatsheet
├─ verify/                verification by measurement
│  ├─ README.md           the repro/measure/fix/re-run loop
│  ├─ template.cjs        throwaway Playwright script starting point
│  ├─ playbook.md         recipes: auth, waiting, reading state, measuring
│  └─ report-checks.cjs   reviewer pass over a finished report page
├─ scripts/
│  ├─ parse_junit.py      JUnit XML -> test-run schema + explicit gap records
│  └─ make_fixtures.py    regenerates samples/synthetic/ (deterministic, seed 42)
└─ samples/
   ├─ FINDINGS.md         checked findings per sample, for prompt block 2
   ├─ PROMPTS.md          the filled-in report prompt per sample
   ├─ BLIND-RUN.md        sandbox layout and the agent instruction behind the shipped reports
   ├─ runs_real.json      real test runs: orbit, 86 tests x 40 builds
   ├─ defects_jira.json   real defects: 300 Apache HADOOP issues, transitions
   ├─ coverage_real.json  real coverage: Apache Commons Math via SonarCloud
   ├─ synthetic/          generated fixtures with planted pathologies (labeled)
   └─ README.md           provenance for all of the above
```

## Quick start

```
# real JUnit XML -> canonical schema (+ gap records)
python3 scripts/parse_junit.py path/to/junit-reports/ --out runs.json

# then, to the AI with the skill loaded:
#   T7  the report prompt from SKILL.md, filled in for runs.json
#   T6  "Critique the attached chart against the anti-pattern rules;
#        compute its lie factor; produce the corrected version and a
#        two-sentence note."
```

All seven templates are in SKILL.md.

## Scope

The skill covers charts that answer known QA questions: flakiness,
durations, coverage, defect flow, co-failure, module comparison. It does
not cover new chart forms or bespoke linked-brushing dashboards, and says
so instead of attempting them.
