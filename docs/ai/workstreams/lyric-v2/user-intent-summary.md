# User Intent Summary

This note captures the motivation behind the Lyric v2 program and the current redesign push.

## What the current system is supposed to do

The current system exists to remove backend heaviness from day-to-day app building.

The intended experience is:
- describe what the data should be
- generate the backend quickly
- get a clean Nuxt-facing runtime surface
- avoid repeatedly hand-assembling routers, controllers, types, and CRUD behavior

The highest-value outcome is not abstraction for its own sake.

It is the feeling that the system simply works.

## What is going wrong today

The current system has become a mixture of many concerns:
- generation
- runtime wiring
- search integration
- tenant control-plane work
- docs
- testing
- utility functions
- operational fixes discovered in downstream apps

That has made the current version powerful but heavy.

Pain points explicitly called out:
- generator combinations are not always trustworthy
- some fixes are local and pragmatic but not obviously the right long-term architecture
- route/controller/type contracts still get muddy for agents
- the graph language has become crowded and too responsible for unrelated concerns
- the current system does not always feel calm, obvious, or dependable
- there is not enough atomic validation of what each part is meant to do

## What version two needs to achieve

Lyric v2 should:
- simplify the emotional and technical experience
- re-evaluate the architecture from the top
- keep the best ideas from v1
- remove muddiness between core schema behavior and optional integrations
- support a cleaner, more explicit runtime contract model
- create room for both deterministic generation and agent-assisted extension

## Why interactive documentation matters

The documentation project is not just for external sharing.

It is intended to:
- hold the generators accountable
- demonstrate each capability one piece at a time
- provide a live proving ground
- expose gaps between intention and reality
- drive atomic tests and cleaner generation

The documentation should act as:
- tutorial
- executable reference
- demo surface
- acceptance test harness
- architecture feedback loop

## Relationship between v1 and v2

- Schema v1 remains active and must keep improving.
- Lyric v2 is the redesign lane.
- Documentation work should harden v1 while informing v2.
- Migration should be incremental, not a chaotic break with all tenant apps.
