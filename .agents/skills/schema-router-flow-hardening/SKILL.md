---
name: schema-router-flow-hardening
description: Use when building or fixing a schema-generated router flow and you need the full contract validated from helper/function generation through router input, controller usage, and end-to-end tests.
---

# Schema Router Flow Hardening

## Goal
Build or repair a schema router flow end to end without leaving contract gaps between frontend, router, generated function, and database behavior.

## Use when
- A generated route is being added or fixed.
- An id/request-shape issue keeps recurring.
- A router/controller flow needs stronger tests.
- A generated function works in isolation but the full request path is unreliable.

## Do not use when
- The task is only to tweak a local UI component that does not affect generated request contracts.

## Read first
1. `docs/ai/runtime/authority-routing.md`
2. `docs/schema-commerce/ridparam-contract.md`
3. `docs/ai/workstreams/schema-v1-5/anti-patterns/record-id-on-uncertain-input.md`
4. The relevant generated router/controller docs for the model

## Default behavior
- State the input contract explicitly before changing code.
- Verify the helper and generated function contract.
- Verify the router input schema.
- Verify the controller/composable call shape.
- Add or update tests at each layer that matters.

## Ask first if
- The correct id-shape policy for the app is unclear.
- The fix requires changing a shared route contract used by multiple tenants.

## Rules
- Do not accept a fix that only works in raw Surreal if the router flow still breaks.
- Do not accept a router fix if malformed ids can still pass unnoticed.
- Prefer explicit request-shape validation over helper complexity.
- When a route depends on ids, test both accepted and rejected shapes.

## Validation
- Helper-level normalization test where relevant
- Generated function or SURQL behavior test
- Router input validation test
- End-to-end route success/failure test

## Definition of done
- The full router flow is explicit from input to DB behavior.
- Tests exist at the relevant layers.
- The resulting contract is clear enough for future agents to follow.
