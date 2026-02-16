-- Session data reset helpers (DMO)
-- Source of truth checked against:
-- - config/graph.mpdg
-- - config/migrations/session/L_sessionEdges.surql
-- - config/migrations/trait/L_traitEdges.surql
-- - config/migrations/traitcolumn/L_traitColumnRelationEdges.surql

-- =========================================================
-- 1) FULL RESET (all users, all sessions)
-- =========================================================
-- WARNING: This removes all session-domain records globally.

BEGIN TRANSACTION;

-- Relation tables (edges)
DELETE SessionRecord;
DELETE SessionState;
DELETE SessionValue;
DELETE Trait;
DELETE TraitColumn;
DELETE TraitColumnEntries;

-- Entity tables
DELETE entry;
DELETE traitColumn;
DELETE trait;
DELETE sessionValue;
DELETE sessionState;
DELETE sessionRecord;
DELETE session;

-- Optional: reset session/trait/entry/time counters on all user records
UPDATE userRecord SET
  sessionsTotal = 0,
  sessionsComplete = 0,
  sessionsIncomplete = 0,
  traitsTotal = 0,
  traitsComplete = 0,
  traitsIncomplete = 0,
  entriesA = 0,
  entriesB = 0,
  entriesTotal = 0,
  entriesPerSession = 0,
  timeTotal = 0,
  timeATotal = 0,
  timeBTotal = 0,
  timePerSession = 0,
  percentageComplete = 0,
  percentageCompleteA = 0,
  percentageCompleteB = 0;

COMMIT TRANSACTION;


-- =========================================================
-- 2) USER-SCOPED RESET (single user)
-- =========================================================
-- Set user email and run this block if you only want one user reset.
-- LET $UID = type::record("u", "apple@apple.com");
--
-- BEGIN TRANSACTION;
--
-- LET $SIDS = (SELECT VALUE id FROM session WHERE u = $UID);
--
-- DELETE SessionRecord WHERE in INSIDE $SIDS;
-- DELETE SessionState WHERE in INSIDE $SIDS;
-- DELETE SessionValue WHERE in INSIDE $SIDS;
--
-- LET $TIDS = (SELECT VALUE id FROM trait WHERE session INSIDE $SIDS);
-- DELETE Trait WHERE in INSIDE $SIDS;
-- DELETE TraitColumn WHERE in INSIDE $TIDS;
--
-- LET $TCIDS = (SELECT VALUE id FROM traitColumn WHERE session INSIDE $SIDS);
-- DELETE TraitColumnEntries WHERE in INSIDE $TCIDS;
--
-- DELETE entry WHERE session INSIDE $SIDS;
-- DELETE traitColumn WHERE session INSIDE $SIDS;
-- DELETE trait WHERE session INSIDE $SIDS;
-- DELETE sessionValue WHERE id INSIDE (SELECT VALUE out FROM SessionValue WHERE in INSIDE $SIDS);
-- DELETE sessionState WHERE id INSIDE (SELECT VALUE out FROM SessionState WHERE in INSIDE $SIDS);
-- DELETE sessionRecord WHERE id INSIDE (SELECT VALUE out FROM SessionRecord WHERE in INSIDE $SIDS);
-- DELETE session WHERE id INSIDE $SIDS;
--
-- UPDATE only type::record("userRecord", $UID) SET
--   sessionsTotal = 0,
--   sessionsComplete = 0,
--   sessionsIncomplete = 0,
--   traitsTotal = 0,
--   traitsComplete = 0,
--   traitsIncomplete = 0,
--   entriesA = 0,
--   entriesB = 0,
--   entriesTotal = 0,
--   entriesPerSession = 0,
--   timeTotal = 0,
--   timeATotal = 0,
--   timeBTotal = 0,
--   timePerSession = 0,
--   percentageComplete = 0,
--   percentageCompleteA = 0,
--   percentageCompleteB = 0;
--
-- COMMIT TRANSACTION;

