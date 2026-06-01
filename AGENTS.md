# General Working Postulates

Cross-project working principles that should stay valid beyond any single repository, framework, or integration. Prefer concise, correct execution over verbose process narration.

## 1. Think First, Act After

For errors, bug reports, regressions, tracebacks, or non-trivial requested changes:

1. Analyze the request and current evidence first.
2. State your understanding of the problem or task.
3. Explain the likely cause, core risk, or intended change.
4. Propose the solution or implementation approach.
5. Wait for user alignment before editing, unless the user has already given a clear execution directive.

Do not treat a pasted error as automatic permission to patch files. If the request is ambiguous, ask or inspect before changing code.

## 2. Project Foundation First

Before implementing in a new project, establish the foundation:

- project boundaries, goals, and expected outcomes;
- base architecture, key modules, integration points, data flows, and responsibility boundaries;
- core business logic, user flows, and supported processes;
- technology stack by layer and the source of truth for each layer;
- official documentation and project-specific materials relevant to that stack.

Align the foundation with the user before major implementation. Once confirmed, capture stable architecture, stack rules, business logic, and source priorities in `AGENTS.md` or an equivalent project directive file so future work does not depend on repeated rediscovery.

## 3. Use Existing Structure And Native Stack First

Decision order for every implementation task:

1. Reuse existing project modules, services, helpers, models, routers, config, logging, and utilities.
2. Extend behavior through native mechanisms of the current stack where they fit.
3. Add custom helpers, wrappers, services, or abstractions only when existing project structure and official stack capabilities are clearly insufficient.

Do not duplicate business logic, bypass configuration flow, hardcode environment-specific values, invent payload shapes already defined by a contract, or replace native async/stack patterns with weaker alternatives. Keep new methods small, single-purpose, and easy to extend.

## 4. Custom Change Self-Check

Before adding custom structure, answer briefly:

- Which existing module, helper, service, model, utility, or stack-native mechanism did I check first?
- Can the change fit the current project structure instead of adding a new layer?
- Is this abstraction truly required, or am I recreating something already provided by the project, stack, or integration contract?
- Is the project foundation clear enough to implement safely?

If the answer is unclear, inspect or align before editing.

## 5. Token-Efficient Execution And Reporting

For every task, choose the shortest workflow that still preserves correctness, safety, maintainability, and verification.

Before acting, estimate:

- scope and risk;
- expected output;
- necessary explanation depth;
- necessary tool use and verification;
- whether a concise answer is enough or implementation detail is required.

Avoid repetitive narration, obvious background, redundant command output, and restating context already available. Do not omit important assumptions, risks, user-facing behavior changes, or test results merely to save tokens.

Short rule: maximize practical task value per token without lowering engineering quality.

## 6. Concise Report After Implementation

After implementation, report only what is useful for the user to understand and verify the result:

- what changed;
- why it changed;
- how it was verified;
- any risks, assumptions, or follow-up needed.

For architectural or non-native changes, also state which existing project abstractions or official stack APIs were used, and why custom code was justified. Do not produce exhaustive logs when a concise summary communicates the same value.

## 7. General Engineering Guardrails

- Prefer official documentation and local source-of-truth files over mismatched examples or blog posts.
- When documentation conflicts with local conventions, preserve current project behavior unless explicitly refactoring.
- Do not store secrets, credentials, or environment-specific runtime values in source code.
- Preserve existing integration contracts and data shapes unless the task explicitly changes them.
- Use project directives such as `AGENTS.md` to lock in approved architecture, stack assumptions, and durable workflow rules.
- When a custom abstraction is necessary, keep it minimal and verify it does not duplicate existing behavior or break current contracts.
