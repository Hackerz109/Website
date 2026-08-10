-- ============================================================
-- Analytics system — data retention / cleanup
-- ============================================================
-- analytics_events, error_logs, and analytics_sessions have no retention
-- policy and grow forever (error_logs especially, since it can spike large:
-- up to ~2KB message + ~4KB stack per row). This adds a single batched purge
-- function plus a daily cron (api/analytics-cleanup, vercel.json) to age
-- rows out.
--
-- Same SECURITY DEFINER / service_role-only shape as analytics_evaluate_
-- alerts() in the previous migration, with one deliberate difference: this
-- function is NOT STABLE. The reporting functions above it (analytics_
-- overview_stats etc.) are read-only and marked STABLE; this one deletes
-- rows, so it must be a normal volatile function — that attribute is not
-- copied over here even though everything else about the shape matches.
--
-- Batching: each table is purged in a loop, deleting BATCH_SIZE rows per
-- DELETE via `WHERE id IN (SELECT id FROM ... WHERE created_at < cutoff
-- LIMIT BATCH_SIZE)` rather than one unbounded DELETE — an unbounded DELETE
-- against a large table scans and rewrites everything in a single statement
-- and can time out, where a small chunk stays fast. The loop is capped at
-- MAX_BATCHES_PER_TABLE per table per invocation (20 batches * 5,000 rows =
-- 100,000 rows/table), so total runtime is bounded and predictable
-- regardless of how large the backlog is. `more_remaining` reports whether
-- a table still has rows past its cutoff after the cap is hit; if so, the
-- next scheduled run (once daily — see vercel.json) picks up where this one
-- left off, so a big first-run backlog clears over a few days rather than
-- risking a timeout trying to do it all in one call. (The cap above is
-- applied per table rather than shared across all three, since each table
-- has its own independent cutoff, volume, and loop — adjust
-- MAX_BATCHES_PER_TABLE if a stricter combined per-invocation bound is ever
-- needed instead.)
--
-- analytics_events.session_id already cascades on analytics_sessions
-- deletion (ON DELETE CASCADE, from the tracking-tables migration), so
-- events and sessions are purged independently by their own age thresholds
-- below rather than re-implementing cascade logic here. A session only
-- becomes old enough to purge (SESSION_RETENTION_DAYS) once every event
-- belonging to it is already well past EVENT_RETENTION_DAYS — the two
-- loops can never double-delete or conflict with each other.
--
-- Age-based deletion is naturally idempotent — re-running with the same
-- cutoffs only ever deletes rows that are still past the cutoff — so no
-- separate dedup/locking logic is needed beyond the batching itself.
--
-- IMPORTANT: once rows are purged, any custom date range (in the reporting
-- functions or the analytics UI) that reaches further back than the
-- retention window below will show zeros for that older data, not an error
-- or missing-data warning. That's expected behavior, not a bug — flagged
-- here so it isn't "discovered" later as a regression. SESSION_RETENTION_
-- DAYS is set to 90 specifically so the existing "90 days" preset in the
-- reports UI (see analytics-dateRange.ts) still has real data for its
-- whole range.

CREATE OR REPLACE FUNCTION public.analytics_purge_old_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Retention windows — named constants so the cutoffs are self-documenting
  -- and only need to change in one place.
  EVENT_RETENTION_DAYS CONSTANT INTEGER := 60;
  ERROR_RETENTION_DAYS CONSTANT INTEGER := 60;
  SESSION_RETENTION_DAYS CONSTANT INTEGER := 90;

  -- Batching knobs — see header comment above for the reasoning.
  BATCH_SIZE CONSTANT INTEGER := 5000;
  MAX_BATCHES_PER_TABLE CONSTANT INTEGER := 20;

  events_cutoff CONSTANT TIMESTAMPTZ := now() - (EVENT_RETENTION_DAYS || ' days')::INTERVAL;
  errors_cutoff CONSTANT TIMESTAMPTZ := now() - (ERROR_RETENTION_DAYS || ' days')::INTERVAL;
  sessions_cutoff CONSTANT TIMESTAMPTZ := now() - (SESSION_RETENTION_DAYS || ' days')::INTERVAL;

  events_deleted INTEGER := 0;
  errors_deleted INTEGER := 0;
  sessions_deleted INTEGER := 0;

  batch_count INTEGER;
  batches INTEGER;
BEGIN
  -- analytics_events
  batches := 0;
  LOOP
    DELETE FROM public.analytics_events
    WHERE id IN (SELECT id FROM public.analytics_events WHERE created_at < events_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    events_deleted := events_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- error_logs
  batches := 0;
  LOOP
    DELETE FROM public.error_logs
    WHERE id IN (SELECT id FROM public.error_logs WHERE created_at < errors_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    errors_deleted := errors_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  -- analytics_sessions (any lingering events on a purged session, past their
  -- own cutoff or not, cascade-delete automatically via the FK — see header)
  batches := 0;
  LOOP
    DELETE FROM public.analytics_sessions
    WHERE id IN (SELECT id FROM public.analytics_sessions WHERE started_at < sessions_cutoff LIMIT BATCH_SIZE);
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    sessions_deleted := sessions_deleted + batch_count;
    batches := batches + 1;
    EXIT WHEN batch_count < BATCH_SIZE OR batches >= MAX_BATCHES_PER_TABLE;
  END LOOP;

  RETURN jsonb_build_object(
    'analytics_events', jsonb_build_object(
      'deleted', events_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.analytics_events WHERE created_at < events_cutoff)
    ),
    'error_logs', jsonb_build_object(
      'deleted', errors_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.error_logs WHERE created_at < errors_cutoff)
    ),
    'analytics_sessions', jsonb_build_object(
      'deleted', sessions_deleted,
      'more_remaining', EXISTS (SELECT 1 FROM public.analytics_sessions WHERE started_at < sessions_cutoff)
    ),
    'ran_at', now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_purge_old_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_purge_old_data() TO service_role;
