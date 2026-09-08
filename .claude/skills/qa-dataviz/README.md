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

## Scope

The skill covers charts that answer known QA questions: flakiness,
durations, coverage, defect flow, co-failure, module comparison. It does
not cover new chart forms or bespoke linked-brushing dashboards, and says
so instead of attempting them.
