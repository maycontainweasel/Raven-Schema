# Session Schema Proposal (Draft)

This document proposes a normalized schema for **Sessions** and their related records, grounded in the current runtime touchpoints (session app, dashboard summary, Surreal functions, and Redis caches). It is written to guide the upcoming schema debate and to serve as the basis for the MPDG graph spec + UI generator work.

Scope:
- Session creation, live session runtime, and post‑session summary.
- Session attempts, per‑question tracking, and per‑term performance.
- The minimum set of tables + relationships needed to reproduce the **PMV2‑V2 `/sessions/:id`** overview in **pmv2‑admin**.
- Compatibility with existing APIs in `packages/pmv2shared/trpc/routers/session.ts`.

---

## 0) Current Touchpoints (What Exists Today)

### A) UI Generator
- `schema:ui:generate` lives in `apps/tools/passmed-schema/package.json` and is documented in `apps/tools/passmed-schema/docs/ui/README.md`.
- Runs via: `pnpm --filter mpdschema schema:ui:generate` (optionally `--spec <model>` + `--project <app>`).

### B) DSL + Schema Pipeline
- DSL spec: `apps/tools/passmed-schema/docs/graph-dsl-profile.md`
- Source of truth: `apps/tools/passmed-schema/config/graph.mpdg`
- Graph → spec: `pnpm --filter mpdschema graph:spec` (or `graph:spec:live`)

### C) Session Runtime + Summary (Observed in Code)
- **Surreal functions**: `fn::createSession`, `fn::processQuestionAttempt`, `fn::processSessionTermsRecords`, etc.
- **TRPC**: `packages/pmv2shared/trpc/routers/session.ts`
- **Dashboard summary**: `apps/pmv2-dashboard/app/pages/sessions/[id].vue` + `stores/sessionSummary.ts`
- **Session app**: `apps/pmv2-session/app/store/session.ts`
- **Redis caches**: `spr:<sid>` and `stpr:<sid>:<term>`

### D) Known Gaps / Mismatches
- Some migration stubs for `sc`, `spr`, `str`, `slog`, `se`, `qa` do not describe the fields actually used in runtime functions.
- `SessionQuestions` edge acts like a full “session question” table but isn’t defined with explicit fields in the schema.
- The **Session Term Record** migration appears to be a copy of `Session` and likely incorrect.

---

## 1) Proposed Core Entities

### A) `s` — Session (Primary)
Represents one session instance (user‑specific).

**Fields (proposed)**
- `uuid` (string, required)
  - Used for session app navigation (`/s/<uuid>`).
- `title` (string, required)
  - Display label (defaults to timestamp).
- `mode` (enum: `learn` | `exam`, required)
- `state` (enum: `untouched` | `in-progress` | `paused` | `complete`, required)
- `active` (boolean, default true)
- `dateCreated` (datetime, required)
- `dateLastActive` (datetime, optional)
- `dateLastTouch` (datetime, optional)  
- `dateCompleted` (datetime, optional)
- `index` (int, default 0)
  - Session index for the user (used in headers).
- `qTotal` (int, required)
- `familiarity` (enum: `all` | `new` | `incorrect`, required)
- `u` (record<u>, required)
- `exams` (array<record<exam>>, required)
  - Resolved exam IDs.
- `terms` (array<{ id: record<exam>, terms: record<qt>[] }>, required)
  - Exam ↔ term selection at creation time.
- `timing` (object)
  - `{ timePerQuestion: number, totalTime: number }`
- `qids` (array<record<q>>, required)
  - The resolved question ID list (order matters).
- `qidsInit` (boolean, default false)
  - Whether questions have been materialized into `SessionQuestions`.
- `qActiveID` (record<q>, optional)
  - Current question (for resume logic).

**Relationships**
- `s -> SessionQuestions -> q`
- `s -> SessionAttempts -> qa`
- `s -> SessionRecord -> spr`
- `s -> SessionLog -> slog`
- `s -> SessionTermRecords -> str`
- `s -> SessionTerms -> qt`
- `u -> UserSessions -> s`
- `exam -> ExamSessions -> s`

**Notes**
- The base session should contain the **resolved** exam/term set and QID charter, not just the UI input.
- `qids` + `SessionQuestions` is redundant but useful: `qids` for fast list, `SessionQuestions` for per‑question metadata (complete, time, etc).

---

### B) `SessionQuestions` — Session → Question Edge (Edge‑Table with Payload)
Treat this as the **SessionQuestion** table in practice.

**Fields (proposed)**
- `id` (record: `SessionQuestions:[s,q]`)
- `order` (int, required)
- `complete` (boolean, default false)
- `startTS` (datetime or epoch, optional)
- `answerTS` (datetime or epoch, optional)
- `totalTime` (number, default 0)
- `lastUpdated` (datetime, optional)

**Relationships**
- `s -> SessionQuestions -> q`

**Notes**
- Used by `initSessionQuestions` to join question content with session‑specific state.

---

### C) `qa` — Question Attempt
One attempt per question answer (session context).

**Fields (proposed)**
- `id` (record: `qa:[s,q,order]`)
- `s` (record<s>)
- `q` (record<q>)
- `u` (record<u>)
- `selectedOptionID` (record<qo>)
- `correct` (boolean)
- `order` (int)
- `startTS` (datetime or epoch)
- `answerTS` (datetime or epoch)
- `totalTime` (number)
- `create_at` (datetime)
- `exams` (array<record<exam>>)
- `examsTerms` (array<{ exam: record<exam>, terms: record<qt>[] }>)
- `terms` (array<{ id: record<exam>, terms: record<qt>[] }>)
- `_reconciliationKey` (string, optional)

**Relationships**
- `s -> SessionAttempts -> qa`
- `q -> QuestionAttempts -> qa`
- `u -> UserAttempts -> qa`
- `exam -> ExamAttempts -> qa`
- `qt -> TermAttempts -> qa`
- `SessionQuestions -> SQAttempt -> qa` (optional, only if needed)

---

### D) `spr` — Session Performance Record
Aggregated summary per session.

**Fields (proposed)**
- `id` (record: `spr:<sid>`)
- `s` (record<s>)
- `u` (record<u>)
- `qTotal` (int)
- `attempts` (int)
- `noCorrect` (int)
- `noIncorrect` (int)
- `noComplete` (int)
- `noIncomplete` (int)
- `percComplete` (number)
- `percCorrect` (number)
- `percCorrectAttempted` (number)
- `totalSessionTime` (number)
- `averageTimePerQ` (number)

**Relationships**
- `s -> SessionRecord -> spr`

---

### E) `str` — Session Term Record
Aggregated per‑term performance for a given session.

**Fields (proposed)**
- `id` (record: `str:[s,qt]`)
- `s` (record<s>)
- `qt` (record<qt>)
- `attempts` (int)
- `noCorrect` (int)
- `noIncorrect` (int)
- `percCorrect` (number)
- `averageTime` (number)
- `totalTime` (number)

**Relationships**
- `s -> SessionTermRecords -> str`
- `s -> SessionTerms -> qt`
- `SessionTerms -> SessionTermsRecord -> str`

---

### F) `slog` + `se` — Session Log & Events
Used for timeline or audit trails.

**`slog`**
- `id` (record: `slog:<sid>`)
- `s` (record<s>)

**`se`**
- `id` (record)
- `action` (string)
- `time` (datetime)
- `payload` (object, optional)
- `qid` (record<q>, optional)
- `sqid` (record<SessionQuestions>, optional)

**Relationships**
- `s -> SessionLog -> slog`
- `slog -> SessionEvents -> se`

---

## 2) Supporting Records (Needed for Summary UI)

These already exist in runtime expectations and should remain compatible:
- **Global question performance**: `qpr`
- **User question performance**: `uqpr`
- **Question option records**: `qopr`, `uqopr`

These are used in the dashboard summary for per‑question analytics and performance overlays.

---

## 3) Redis Caches (Derived, Not Source of Truth)

Used for fast dashboard rendering and trend updates:
- `spr:<sid>` → session performance cache
  - `{ a, qc, pcor, tt, aqt, pcom }`
- `stpr:<sid>:<termId>` → per‑term performance
  - `{ a, qc, pcor }`

Redis caches should be treated as **derived** from `qa` + `spr` + `str`, with safe fallbacks to Surreal.

---

## 4) Proposed MPDG Skeleton (Draft)

This is a starting point for `graph.mpdg` (not final):

```
Session, s {
  id: default
  uuid!: ""
  title!: "New Session"
  mode!: "learn", <"learn"|"exam">
  state!: "untouched"
  active!: true
  dateCreated!: "", <datetime>
  dateLastActive?: "", <datetime>
  dateLastTouch?: "", <datetime>
  dateCompleted?: "", <datetime>
  index: 0
  qTotal!: 0
  familiarity!: "all", <"all"|"new"|"incorrect">
  u!: "", <record<u>> <assign>
  exams: [], <array<record<exam>>>
  terms: [], <array<object>>
  timing: {}, <object>
  qids: [], <array<record<q>>>
  qidsInit: false
  qActiveID?: "", <record<q>>
}[
  crud
  router
  views: admin, public
  instance<local>
] (
  ->SessionQuestions->q {}
  ->SessionAttempts->qa {}
  ->SessionRecord->spr {}
  ->SessionLog->slog {}
  ->SessionTerms->qt {}
  ->SessionTermRecords->str {}
  <-UserSessions<-u {}
  <-ExamSessions<-exam {}
)
```

Edge‑tables `SessionQuestions`, `SessionTermsRecord`, and `SessionTermRecords` should be promoted to explicit specs so they can carry payload fields.

---

## 5) Admin UI Targets (for Schema UI Generator)

To replicate the public session summary in **pmv2‑admin**, we need:

1) **Session directory** (overview)
- Table: `s`
- Columns: `title`, `mode`, `state`, `dateCreated`, `dateLastActive`, `qTotal`, `u`
- Filters: `state`, `mode`, `dateCreated`, `user`

2) **Session single page** (overview + analytics)
- Base session (`s`)
- Session record (`spr`)
- Session questions (`SessionQuestions + q`)
- Attempts (`qa`)
- Session term records (`str + qt`)
- Timeline (`slog + se`)

3) **Admin controls**
- Mark complete / reopen
- Rebuild caches (recompute `spr` / `str`)
- Jump to question in session

---

## 6) Open Questions / Debate Points

1) **Should `SessionCharter (sc)` become a real record?**
   - It currently exists as a relationship but has no fields. It could store raw request input, resolved exams/terms, filters, and QID charter for auditability.

2) **Where should the canonical question list live?**
   - `s.qids` vs `SessionQuestions` edge vs both. Keeping both is convenient but introduces dual‑write maintenance.

3) **Event + timing source of truth**
   - Session time is recorded in Redis and in `spr.totalSessionTime`. Should we always recompute from `se` events, or treat `spr` as canonical?

4) **Session terms**
   - Are session categories strictly derived from questions (`SessionTerms` is derived), or can sessions be manually assigned terms?

5) **Admin vs Public view parity**
   - Which fields are strictly for admin (auditing, overrides, reruns) vs user view?

---

## 7) Recommended Next Steps

1) Formalize the above schema into MPDG specs (including edge tables) and fix missing fields in the current stubs.
2) Add a `session.ui.yaml` in `apps/tools/passmed-schema/config/ui` for the admin generator.
3) Build a **session admin overview page** that mirrors the dashv2 summary layout but with admin actions.
4) Decide whether `SessionCharter` becomes canonical (vs embedded `s.terms/exams`).

---

This proposal is deliberately modular so we can debate and lock each part without blocking UI generation.
