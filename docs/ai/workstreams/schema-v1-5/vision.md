# Schema v1.5 Vision

Schema v1.5 is the effort to make the current platform dramatically more reliable without forcing a full v2 migration.

## Purpose

The current system already has real value.

Schema v1.5 exists to:
- clarify the contracts that agents keep getting wrong
- reduce helper and generator bloat
- separate core shared utilities from optional app-level behavior
- make frontend-to-router-to-database data shapes explicit and testable
- require better end-to-end verification for generated flows

## Current focus areas

1. Minimal shared helper contracts
2. Explicit id-shape and request-shape policy
3. Utility-library separation between:
   - always-shared core helpers
   - optional/adoptable helpers
   - app-owned overrides
4. Recipes and skills for frontend/backend interface work
5. Tests that stop malformed request shapes before they reach Surreal
6. Function and router-flow verification from helper to router to runtime
