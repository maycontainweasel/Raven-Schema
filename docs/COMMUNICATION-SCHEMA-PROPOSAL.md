# Communication Schema Proposal (Draft)

This document proposes a SurrealDB schema for the Communication Portal. It is written so another AI (or teammate) can understand the design and the reasoning behind each field.

Scope:
- Communication inbox for admin users (threads + messages).
- Structured metadata for support, feedback, and general inquiries.
- Fast list views (inbox), detail views, and search.
- Compatibility with the existing communication types in `apps/pmv2-mothership/app/types/resources/communication.ts`.

---

## 1) Core Entities

### A) `comm_thread` (CommunicationThread)
Represents a conversation thread, used for inbox listing and high-level state.

Fields (proposed) with rationale:
- `subject` (string, required)
  - Human-readable title for the thread; primary list item label.
- `category` (enum: general | help | question-feedback, required)
  - High-level grouping for filters and routing.
- `subcategory` (string, optional)
  - Allows more specific grouping without schema changes (e.g., "payment", "account").
- `tags` (array<string>, default [])
  - Flexible labels for triage and admin workflows (e.g., "urgent", "payment").
- `sourceChannel` (enum: public-contact | dashboard-help | question-feedback, required)
  - Where the message originated (public form, dashboard, question feedback).
- `sourceInstance` (string, optional)
  - Which PassMed instance the message came from (UK/US/Global, etc.).
- `sourceContext` (object, optional)
  - Context pointers (questionRid, examRid, url, etc.) to reproduce the issue.
- `contactProfile` (object, required)
  - Snapshot of the contact data at time of creation.
  - Includes: `name`, `email`, optional `phoneNumber`, optional `userRid`, optional `instanceUserRid`.
- `status` (enum: new | open | pending | closed | archived, required)
  - Supports admin workflow state.
- `priority` (enum: low | normal | high, optional)
  - Allows triage ordering and SLA views.
- `assignedAdmin` (record<user>, optional)
  - Optional ownership for follow-up or assignment workflows. (Can be omitted if only one admin exists.)
- `unreadAdminCount` (int, required, default 0)
  - Fast badge counts for the inbox. Allows "New" filters without scanning messages.
- `firstMessage` (record<comm_message>, optional)
  - Direct link to the first message in thread.
- `lastMessage` (record<comm_message>, optional)
  - Direct link to most recent message, used for preview/time.
- `messageIds` (array<record<comm_message>>, default [])
  - Denormalized list of messages for quick thread fetch without extra query.
- `createdAt` (datetime, required)
  - Thread creation timestamp.
- `updatedAt` (datetime, required)
  - Last metadata update (status/priority/assignment/tags/etc).
- `lastMessageAt` (datetime, required)
  - Timestamp of last message in thread (sort order for inbox).

Why thread-level denormalization?
- Inbox UI needs fast display of subject, preview, last message time, unread count.
- Having `lastMessageAt` and `lastMessage` avoids heavy joins for list views.

---

### B) `comm_message` (CommunicationMessage)
Represents each message in the thread.

Fields (proposed) with rationale:
- `thread` (record<comm_thread>, required)
  - Parent reference for grouping and list/detail queries.
- `direction` (enum: inbound | outbound | system, required)
  - Distinguishes user messages from admin replies and automated/system notices.
- `authorProfile` (object, required)
  - Snapshot of author identity at send time.
  - Contains: `name`, optional `email`, `role` (user | admin | system), optional `userRid`.
- `body` (string, required)
  - Plain text body for display and search.
- `richBody` (object, optional)
  - Optional rich-content structure (JSON), for editors or future formatting.
- `tags` (array<string>, default [])
  - Message-level tags when needed (e.g., "internal-note").
- `createdAt` (datetime, required)
  - Message creation timestamp.
- `readAt` (datetime, optional)
  - Simple read tracking for admin (global). If per-admin read is needed, see optional tables below.

Why keep both `body` and `richBody`?
- `body` supports fast rendering/search and is always present.
- `richBody` allows future editor features without migration pain.

---

## 2) Supporting Entities

### A) `comm_taxonomy`
Catalog of environments, categories, and subcategories used by the UI and validation.

Fields:
- `type` (enum: environment | category | subcategory)
  - Identifies what kind of taxonomy row it is.
- `key` (string, required, unique)
  - Stable machine key (e.g., `public-contact`, `general_enquiry`, `incorrect`).
- `label` (string, required)
  - Human-friendly label for UI dropdowns.
- `category` (enum: general | help | question-feedback, optional)
  - Links subcategories to their parent category.
- `sourceChannel` (enum: public-contact | dashboard-help | question-feedback, optional)
  - Links categories/subcategories back to an environment.
- `parentKey` (string, optional)
  - Optional parent pointer for hierarchy.
- `order` (int, optional)
  - UI ordering.
- `active` (boolean, default true)
  - Allows soft deactivation without deleting.

Why:
- Gives us a single source of truth for dropdowns and filters.
- Lets us evolve categories without code changes.

### B) `comm_event`
Audit log for status/priority/assignment changes.

Fields:
- `thread` (record<comm_thread>)
- `type` (enum: status-change | priority-change | assignment-change | tag-change | note)
- `payload` (object)
- `createdAt` (datetime)
- `actor` (record<user> or object)

Why:
- Helps compliance, audit trails, and timeline views.

### C) `comm_attachment` (removed for now)
Not needed at this stage since there are no attachments.

---

## 3) Relationships

Primary relationships:
- `comm_thread` -> `comm_message` (one-to-many)
  - Implement via `comm_message.thread` + optional edge (`rel_comm_thread_comm_message`).

Optional relationships:
- `comm_thread` -> `comm_event` (one-to-many)

---

## 4) Views (for fast query patterns)

### Thread Admin List View (suggested)
Purpose: inbox listing (subject, contact, preview, last message time).

Fields:
- `id`, `subject`, `category`, `tags`, `status`, `priority`
- `sourceChannel`, `sourceInstance`
- `contactProfile.name`, `contactProfile.email`
- `unreadAdminCount`, `lastMessageAt`, `createdAt`
- `lastMessage` (for preview or fetch)

### Thread Typesense View (suggested)
Purpose: search integration for fast filtering.

Fields:
- `id`, `subject`, `preview` (derived from last message)
- `category`, `subcategory`, `tags`
- `status`, `priority`
- `source_channel`, `source_instance`
- `contact_name`, `contact_email`
- `last_message_at`, `created_at`

### Message View (optional)
Purpose: quick message fetch within thread for admin UI.

Fields:
- `id`, `thread`, `direction`, `authorProfile`, `body`, `createdAt`, `readAt`

---

## 5) Indexes (suggested)

Thread indexes:
- `status`
- `category`
- `priority`
- `sourceInstance`
- `assignedAdmin`
- `lastMessageAt` (sort for inbox)
- `contactProfile.email` (lookup)
- Fulltext (optional): `subject` + last message preview

Message indexes:
- `thread`
- `createdAt`
- `direction`
- Fulltext (optional): `body`

Why:
- Keeps inbox and search responsive.

---

## 6) Events / Hooks (suggested behavior)

When a new `comm_message` is created:
- Update `comm_thread.lastMessage`, `lastMessageAt`, `messageIds`, and increment `unreadAdminCount`.
- If status is `new`, transition to `open`.

When a message is marked read:
- Decrement `unreadAdminCount` or recompute for safety.

When thread metadata changes:
- Update `updatedAt`.
- Optionally log to `comm_event`.

These can be implemented via CRUD hooks or table events in the schema tooling.

---

## 7) Alignment with existing UI types

The types in `apps/pmv2-mothership/app/types/resources/communication.ts` already match most of this:
- Thread types map to `comm_thread`.
- Message types map to `comm_message`.
- Typesense doc fields align with the proposed search view.

This proposal keeps those types stable, so UI integration should be straightforward.

---

## 8) Threading Approach (MVP Decision)

Chosen approach: **simplest + explicit threading**

- Every new submission (contact form, help form, question feedback) creates a **new thread**.
- Replies to an existing thread must carry a **thread id** (e.g., via UI reply action or a token in email links).
- This ensures “same issue” stays in the same thread without risky heuristics.

This keeps behavior predictable and avoids accidental merges.

---

## 9) Assignment (MVP Decision)

- Keep `assignedAdmin` as an optional field for future-proofing.
