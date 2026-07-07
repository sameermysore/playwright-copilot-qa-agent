# Ideation History: Why TestPilot AI Was Conceived

> This document captures the thinking *before and around* implementation.
> It is intentionally different from `README.md` (usage) and `docs/engineering-design.md` (design).

## Document intent

This file explains the original idea behind this project:

- why it was needed
- what problem it was meant to solve
- what approaches were considered
- what product direction shaped implementation

## Problem that triggered the idea

When tests fail, debugging is a general, repetitive cycle: read the output, form a hypothesis, and work out what went wrong. Root cause analysis (RCA) is part of that — but it gets harder when the failure might be in the test, the page object, or the application source code itself.

The question that drove this project: why not handle that whole flow with an agent that uses skills properly — run tests, investigate failures, distinguish test-side from app-side issues, and fix with clear guardrails?

That felt like a natural fit for Playwright failures, where you often need both test artifacts and source code context to reach a real answer.

## Why this was built

The core motivation was to create a QA copilot that can:

- execute tests on demand
- perform structured RCA from artifacts
- suggest or apply practical fixes
- keep an auditable record of decisions and outcomes

The project intentionally treats the workflow as a teaching tool by turning tacit QA habits into explicit, skill-driven steps.

## Initial idea and constraints

### What we wanted

- A practical assistant, not just a chat bot
- Clear skill boundaries (run, analyze, fix, report)
- Reproducible outputs that can be revisited later
- Safety gate for application source changes

### What we wanted to avoid

- Silent code edits without documentation
- Mixed responsibilities across one large prompt
- Untraceable “magic” decisions

## Personal motivation at ideation time

I wanted to build an agent with properly working skills — not one prompt that tries to do everything, but distinct skills with clear responsibilities and handoffs.

A big part of the motivation was to demonstrate understanding of agents and skills end to end: how to design the workflow, wire the skills, and ship something that actually runs tests, produces RCA, and applies fixes in a controlled way.

## Approaches considered during ideation

### Approach A: Single monolithic agent behavior

- **Pros:** less setup, one prompt to maintain
- **Cons:** harder to control, weaker auditability, complex routing

### Approach B: Skill-based workflow (chosen)

- **Pros:** clear phases, explicit handoffs, easier maintenance, safer approvals
- **Cons:** requires writing and maintaining multiple skill files

Trade-off accepted: we chose more setup complexity in exchange for clearer behavior and better teachability.

## Key ideation decisions that shaped build

1. **Separation of analysis and fixing**
   - RCA should not edit code.
   - Fixing should happen in a dedicated phase with validation.

2. **Explicit approval model**
   - Test-side fixes can proceed faster.
   - Source-repo edits require user approval.

3. **Artifact-first traceability**
   - Session outputs (`failure-report`, `diagnosis`, `root-cause`, `fixer-report`) become the working memory and audit trail.

4. **Skill routing from natural prompts**
   - Users can ask in plain language ("run tests", "check failures", "fix"), while behavior remains structured.

## What this project does today (ideation outcome)

The implemented system reflects the original idea:

- `playwright-test-runner` executes full and failed reruns
- `playwright-rca` investigates failures and classifies actions
- `playwright-fixer` applies fixes and validates with reruns
- `generate-rca-report` produces optional HTML report output

## How it can be used

Typical usage pattern:

1. Ask to run tests
2. Ask to investigate failures, including source repo path/link
3. Ask to fix failures
4. Optionally ask for HTML report

This keeps usage simple while preserving controlled, phase-based execution.

Primary audience from the ideation perspective: QA engineers who need a guided, explainable path from failure to validated fix.

## Non-goals from ideation perspective

- Replacing deep product decision-making
- Fully autonomous source refactoring without approval
- Eliminating all environment-related flakiness

## Open ideation questions for future evolution

- Should this expand into CI-triggered autonomous triage loops?
- Should confidence scoring drive automated approval recommendations?
- Should session outcomes be aggregated into trend dashboards?

## Status

This ideation narrative is a living record and can evolve as project goals evolve.
