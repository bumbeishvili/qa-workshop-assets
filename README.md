# qa-workshop-assets

Files for the workshop "Data visualization with D3 and AI" (QA conference,
9 September 2026). Slides: https://qa.davidb.dev

```
qa-dataviz-skill/            the skill: rules, D3 convention, verification,
                             sample data, checked findings, the report prompts
samples/coverage_real.json   the coverage sample on its own: Apache Commons
                             Math via SonarCloud, 76 directories
```

## Install the skill

```
git clone https://github.com/bumbeishvili/qa-workshop-assets
mkdir -p .claude/skills && cp -r qa-workshop-assets/qa-dataviz-skill .claude/skills/qa-dataviz
```

Use `~/.claude/skills/qa-dataviz` as the target to have it in every project.
For tools other than Claude Code, paste `qa-dataviz-skill/SKILL.md` into the
system context and keep the linked files reachable.

## Build a report

The prompt for each sample is in `qa-dataviz-skill/samples/PROMPTS.md`; with
the skill installed, that prompt is the whole request. The checked numbers
it carries are in `qa-dataviz-skill/samples/FINDINGS.md`. To review a
generated page by measurement:

```
NODE_PATH="$(npm root -g)" node qa-dataviz-skill/verify/report-checks.cjs path/to/index.html
```
