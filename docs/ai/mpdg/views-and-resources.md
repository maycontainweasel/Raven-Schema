# Views And Resources

## Purpose
The `views:` mini-language defines reusable named data shapes. Those shapes feed generated views, generated functions, and generated runtime contracts.

## Authoring rules
- Start from the fields actually needed by the caller.
- Prefer the narrowest existing resource that already satisfies the requirement.
- Use `views:` to create reusable contracts. Do not fake reusable shapes in page code.
- Function-backed resources and generated-function resources are allowed, but they are still reusable schema contracts and must be treated as such.

## Before adding or changing a resource
State:
- the resource name
- whether it is view-backed or function-backed
- the exact fields it returns
- which consumers need it
- whether an existing resource already fits

## Non-negotiable rules
- Resource names must be unique per model.
- Do not invent selector names like `Admin` or `Public` by assumption.
- If no existing resource fits, inspect the current stanza and ask before creating a new reusable resource.
- If a resource is narrow and one-off, prefer the smallest reusable shape that solves the task rather than a bloated “god resource”.

## Validation rule
If `views:` changes, validation must leave you confident about:
- unique selector names
- correct generated outputs
- no missing fields that downstream code expects

## AI interpretation
When asked to “add a resource” or “build a view”, the agent should interpret that as schema contract work, not as page-only data-shaping work.
