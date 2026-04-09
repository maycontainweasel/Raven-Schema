# Lyric V2 Vision

## Summary

Lyric v2 is the planned successor to Schema v1.

It should feel:
- light
- expressive
- reliable
- modular
- easy for agents to understand
- easy for a human to trust

The promise is simple:

> describe the data and intent clearly, then the backend, runtime contracts, and developer surface appear cleanly and predictably.

## Product direction

Lyric v2 is not just a generator.

It is intended to become:
- a schema authoring environment
- a generator/runtime platform
- a management surface for data and generated contracts
- a documentation and verification system
- a bridge between deterministic generators and agent-assisted extension

The likely long-term shape is:
- local dev workspace
- web app
- desktop or cloud-hosted control surface later

## Core architectural commitments

### 1. Stable spec core

Everything converges on a canonical spec layer.

Inputs that should compile into the spec layer:
- high-level authoring language
- interactive UI authoring
- reusable templates or shared packages

Outputs that should consume the spec layer:
- deterministic generators
- runtime metadata
- docs/demos/testing manifests
- plugin systems
- agent prompt generation

### 2. Deterministic-first generation

Base CRUD, views, routes, types, migrations, and runtime contracts must still generate without agents.

That deterministic lane remains the trusted baseline.

### 3. Agent-assisted extension

Agents should help with:
- custom functions
- advanced patterns
- research-backed optimizations
- architecture-aware implementation prompts

Agents should not replace the base generator path.

### 4. Plugin boundaries

Cross-cutting systems such as search and similar integrations should not pollute the authoring core when they can be modeled as plugin or layer behavior.

The core authoring model should stay focused on:
- data shape
- relationships
- lifecycle
- runtime exposure

### 5. Testable atomic capabilities

The platform should be decomposed into capability units that can each be:
- documented
- generated
- inspected
- executed
- verified

This is the basis for both v1 hardening and v2 design quality.

## Strategic themes

### Lightness and authoring feel

Lyric v2 should feel closer to writing than configuration engineering.

The naming direction should support:
- lyric
- stanza
- lighter source artifacts
- human-readable authoring

The emotional goal is reduced friction, not only technical power.

### Runtime honesty

The system must stop pretending that hidden complexity is solved when it is not.

Key honesty points:
- record id policy
- route/controller contract clarity
- instance and authority rules
- schema-full support
- plugin boundaries
- explicit failure modes

### Documentation as proving ground

The documentation experience is not marketing collateral.

It is a live proving ground that should make generator gaps obvious and force each capability to be battle-tested.

## Immediate v2 outputs

The first v2 program outputs should be:
- the v2 vision and architecture docs
- a capability inventory
- a sibling interactive docs app
- a clearer v1/v2 boundary
- explicit migration-safe naming/versioning guidance
