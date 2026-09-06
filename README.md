# qa-workshop-assets

A project folder for the workshop "Data visualization with D3 and AI" (QA
conference, 9 September 2026). Slides: https://qa.davidb.dev

Clone it and open the folder in Claude Code. The skill is already installed.

```
git clone https://github.com/bumbeishvili/qa-workshop-assets
cd qa-workshop-assets
claude
```

```
.claude/skills/qa-dataviz/   the skill: rules, D3 convention, verification,
                             sample data, checked findings, the report prompts
samples/coverage_real.json   the coverage sample: Apache Commons Math via
                             SonarCloud, 76 directories
```

## Build the coverage report

Paste the coverage prompt from `.claude/skills/qa-dataviz/samples/PROMPTS.md`
into Claude Code. With the skill loaded, that prompt is the whole request;
the checked numbers it carries are in `samples/FINDINGS.md` next to it.

To review a generated page by measurement:

```
NODE_PATH="$(npm root -g)" node .claude/skills/qa-dataviz/verify/report-checks.cjs path/to/index.html
```

To use the skill in another project, copy `.claude/skills/qa-dataviz` there,
or into `~/.claude/skills` for every project.
