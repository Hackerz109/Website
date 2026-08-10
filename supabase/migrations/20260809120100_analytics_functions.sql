-- ============================================================
-- Analytics system — part 2: ingestion + reporting functions
-- ============================================================
-- Reporting functions follow admin_dashboard_stats' own convention exactly:
-- SECURITY DEFINER, has_role() gate returning a jsonb error, one big
-- jsonb_build_object, GRANT EXECUTE TO authenticated. They also match its
-- existing choice of filtering paid orders by created_at (not paid_at) so
-- numbers here agree with the existing /admin Overview page for the same
-- nominal period.
--
-- Ingestion + alert-evaluation functions are the opposite: never GRANTed to
-- authenticated/anon, reachable only through the service-role key from the
-- new /api/analytics-track, /api/analytics-error and
-- /api/analytics-alerts-check routes, which enforce their own rate limiting
-- and (for the alerts check) admin/cron-secret auth before calling in. They
-- deliberately don't re-check has_role(auth.uid(), 'admin') themselves,
-- since auth.uid() is NULL both for the service-role caller and for a
-- genuinely unauthenticated one — the only real enforcement is the missing
-- GRANT.

-- ============================================================
-- Ingestion
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_ingest_event(p_session_id UUID, p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.analytics_sessions (
    id, user_id, device_id, started_at, last_seen_at, entry_path, exit_path, page_view_count,
    referrer, utm_source, utm_medium, utm_campaign, device_type, browser, os, country, region, city
  ) VALUES (
    p_session_id,
    NULLIF(p_payload->>'user_id', '')::UUID,
    p_payload->>'device_id',
    now(), now(),
    p_payload->>'path', p_payload->>'path', 1,
    NULLIF(p_payload->>'referrer', ''), NULLIF(p_payload->>'utm_source', ''),
    NULLIF(p_payload->>'utm_medium', ''), NULLIF(p_payload->>'utm_campaign', ''),
    p_payload->>'device_type', p_payload->>'browser', p_payload->>'os',
    p_payload->>'country', p_payload->>'region', p_payload->>'city'
  )
  ON CONFLICT (id) DO UPDATE SET
    last_seen_at = now(),
    exit_path = COALESCE(p_payload->>'path', public.analytics_sessions.exit_path),
    page_view_count = public.analytics_sessions.page_view_count + 1,
    user_id = COALESCE(NULLIF(p_payload->>'user_id', '')::UUID, public.analytics_sessions.user_id);

  INSERT INTO public.analytics_events (session_id, user_id, event_type, path, referrer)
  VALUES (
    p_session_id,
    NULLIF(p_payload->>'user_id', '')::UUID,
    COALESCE(NULLIF(p_payload->>'event_type', ''), 'page_view'),
    p_payload->>'path',
    NULLIF(p_payload->>'referrer', '')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_ingest_event(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_ingest_event(UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.analytics_log_client_error(p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.error_logs (
    error_type, severity, message, stack, path, status_code, device_type, browser, session_id, user_id
  ) VALUES (
    COALESCE(NULLIF(p_payload->>'error_type', ''), 'frontend'),
    COALESCE(NULLIF(p_payload->>'severity', ''), 'error'),
    left(COALESCE(NULLIF(p_payload->>'message', ''), 'Unknown error'), 2000),
    left(p_payload->>'stack', 4000),
    p_payload->>'path',
    NULLIF(p_payload->>'status_code', '')::INTEGER,
    p_payload->>'device_type',
    p_payload->>'browser',
    NULLIF(p_payload->>'session_id', '')::UUID,
    NULLIF(p_payload->>'user_id', '')::UUID
  );
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_log_client_error(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_log_client_error(JSONB) TO service_role;

-- Bulk-resolve every occurrence of one error "group" (same type+message+page).
CREATE OR REPLACE FUNCTION public.analytics_resolve_error_group(p_error_type TEXT, p_message TEXT, p_path TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  UPDATE public.error_logs
  SET resolved = true, resolved_at = now(), resolved_by = auth.uid()
  WHERE error_type = p_error_type AND message = p_message
    AND ((path IS NULL AND p_path IS NULL) OR path = p_path)
    AND resolved = false;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN jsonb_build_object('resolved_count', affected);
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_resolve_error_group(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_resolve_error_group(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- 1. Executive Overview
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_overview_stats(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_prev_start TIMESTAMPTZ, p_prev_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'current', jsonb_build_object(
      'total_users', (SELECT count(*) FROM public.profiles WHERE created_at <= p_end),
      'new_users', (SELECT count(*) FROM public.profiles WHERE created_at >= p_start AND created_at <= p_end),
      'active_users', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end),
      'total_sessions', (SELECT count(*) FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end),
      'page_views', (SELECT count(*) FROM public.analytics_events WHERE event_type = 'page_view' AND created_at >= p_start AND created_at <= p_end),
      'revenue_cents', (SELECT COALESCE(sum(total_cents), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
      'transactions', (SELECT count(*) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
      'conversion_rate', (
        SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(
          (SELECT count(*) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end)::numeric
          / count(*) * 100, 2)
        END FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end
      ),
      'error_rate', (
        SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(
          (SELECT count(*) FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end)::numeric
          / count(*) * 100, 3)
        END FROM public.analytics_events WHERE created_at >= p_start AND created_at <= p_end
      ),
      'critical_events', (SELECT count(*) FROM public.error_logs WHERE severity = 'critical' AND created_at >= p_start AND created_at <= p_end)
    ),
    'previous', jsonb_build_object(
      'total_users', (SELECT count(*) FROM public.profiles WHERE created_at <= p_prev_end),
      'new_users', (SELECT count(*) FROM public.profiles WHERE created_at >= p_prev_start AND created_at <= p_prev_end),
      'active_users', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end),
      'total_sessions', (SELECT count(*) FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end),
      'page_views', (SELECT count(*) FROM public.analytics_events WHERE event_type = 'page_view' AND created_at >= p_prev_start AND created_at <= p_prev_end),
      'revenue_cents', (SELECT COALESCE(sum(total_cents), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_prev_start AND created_at <= p_prev_end),
      'transactions', (SELECT count(*) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_prev_start AND created_at <= p_prev_end),
      'conversion_rate', (
        SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(
          (SELECT count(*) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_prev_start AND created_at <= p_prev_end)::numeric
          / count(*) * 100, 2)
        END FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end
      ),
      'error_rate', (
        SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(
          (SELECT count(*) FROM public.error_logs WHERE created_at >= p_prev_start AND created_at <= p_prev_end)::numeric
          / count(*) * 100, 3)
        END FROM public.analytics_events WHERE created_at >= p_prev_start AND created_at <= p_prev_end
      ),
      'critical_events', (SELECT count(*) FROM public.error_logs WHERE severity = 'critical' AND created_at >= p_prev_start AND created_at <= p_prev_end)
    ),
    'current_online', (SELECT count(*) FROM public.analytics_sessions WHERE last_seen_at >= now() - interval '5 minutes'),
    'revenue_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'revenue_cents', COALESCE(o.rev, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') AS d(day)
      LEFT JOIN (
        SELECT date_trunc('day', created_at) AS day, sum(total_cents) AS rev FROM public.orders
        WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end GROUP BY 1
      ) o ON o.day = d.day
    ),
    'system_health', jsonb_build_object(
      'status', (
        SELECT CASE
          WHEN (SELECT count(*) FROM public.error_logs WHERE severity = 'critical' AND created_at >= now() - interval '1 hour') > 0 THEN 'critical'
          WHEN (SELECT count(*) FROM public.error_logs WHERE severity = 'error' AND created_at >= now() - interval '1 hour') > 10 THEN 'degraded'
          ELSE 'healthy'
        END
      ),
      'errors_last_hour', (SELECT count(*) FROM public.error_logs WHERE created_at >= now() - interval '1 hour'),
      'uptime_pct', (
        SELECT CASE WHEN count(*) = 0 THEN 100
        ELSE round(100 * (1 - (count(*) FILTER (WHERE had_critical))::numeric / count(*)), 2) END
        FROM (
          SELECT h AS bucket, EXISTS (
            SELECT 1 FROM public.error_logs e WHERE e.severity = 'critical' AND e.created_at >= h AND e.created_at < h + interval '1 hour'
          ) AS had_critical
          FROM generate_series(date_trunc('hour', p_start), date_trunc('hour', p_end), interval '1 hour') AS h
        ) buckets
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_overview_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_overview_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_overview_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ============================================================
-- 2. User Analytics
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_user_stats(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_prev_start TIMESTAMPTZ, p_prev_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'total_registered', (SELECT count(*) FROM public.profiles WHERE created_at <= p_end),
    'new_registrations', (SELECT count(*) FROM public.profiles WHERE created_at >= p_start AND created_at <= p_end),
    'new_registrations_prev', (SELECT count(*) FROM public.profiles WHERE created_at >= p_prev_start AND created_at <= p_prev_end),
    'active_users', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end),
    'dau', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM public.analytics_sessions WHERE started_at >= p_end - interval '1 day' AND started_at <= p_end),
    'wau', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM public.analytics_sessions WHERE started_at >= p_end - interval '7 days' AND started_at <= p_end),
    'mau', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM public.analytics_sessions WHERE started_at >= p_end - interval '30 days' AND started_at <= p_end),
    'dormant_users', (SELECT count(*) FROM public.profiles WHERE created_at <= p_end - interval '30 days' AND (last_seen_at IS NULL OR last_seen_at < p_end - interval '30 days')),
    'avg_session_duration_seconds', (
      SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (last_seen_at - started_at)))), 0)
      FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end AND last_seen_at > started_at
    ),
    'sessions_per_user', (
      SELECT CASE WHEN count(DISTINCT COALESCE(user_id::text, device_id, id::text)) = 0 THEN 0
      ELSE round(count(*)::numeric / count(DISTINCT COALESCE(user_id::text, device_id, id::text)), 2) END
      FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end
    ),
    'login_frequency', (
      SELECT CASE WHEN count(DISTINCT user_id) = 0 THEN 0
      ELSE round(count(*)::numeric / count(DISTINCT user_id), 2) END
      FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end AND user_id IS NOT NULL
    ),
    'churn_rate_pct', (
      WITH prior_customers AS (
        SELECT DISTINCT user_id FROM public.orders WHERE payment_status = 'paid' AND user_id IS NOT NULL AND created_at < p_start
      ), still_active AS (
        SELECT DISTINCT user_id FROM public.orders WHERE payment_status = 'paid' AND user_id IS NOT NULL AND created_at >= p_start AND created_at <= p_end
      )
      SELECT CASE WHEN (SELECT count(*) FROM prior_customers) = 0 THEN 0
      ELSE round(100.0 * (SELECT count(*) FROM prior_customers WHERE user_id NOT IN (SELECT user_id FROM still_active)) / (SELECT count(*) FROM prior_customers), 1)
      END
    ),
    'registrations_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'registrations', COALESCE(p.cnt, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') AS d(day)
      LEFT JOIN (SELECT date_trunc('day', created_at) AS day, count(*) AS cnt FROM public.profiles WHERE created_at >= p_start AND created_at <= p_end GROUP BY 1) p ON p.day = d.day
    ),
    'new_vs_returning_by_day', (
      WITH identity_days AS (
        SELECT DISTINCT date_trunc('day', started_at) AS day, COALESCE(user_id::text, device_id, id::text) AS identity
        FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end
      ), first_seen AS (
        SELECT COALESCE(user_id::text, device_id, id::text) AS identity, min(started_at) AS first_at
        FROM public.analytics_sessions GROUP BY 1
      ), tagged AS (
        SELECT idd.day, (fs.first_at >= idd.day AND fs.first_at < idd.day + interval '1 day') AS is_new
        FROM identity_days idd JOIN first_seen fs ON fs.identity = idd.identity
      ), per_day AS (
        SELECT day, count(*) FILTER (WHERE is_new) AS new_count, count(*) FILTER (WHERE NOT is_new) AS returning_count
        FROM tagged GROUP BY day
      )
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(day, 'YYYY-MM-DD'), 'new', new_count, 'returning', returning_count) ORDER BY day), '[]'::jsonb)
      FROM per_day
    ),
    'retention_by_day', (
      WITH daily_actives AS (
        SELECT DISTINCT date_trunc('day', started_at) AS day, COALESCE(user_id::text, device_id, id::text) AS identity
        FROM public.analytics_sessions WHERE started_at >= p_start - interval '1 day' AND started_at <= p_end
      ), per_day AS (
        SELECT t.day, count(DISTINCT t.identity) AS active_count, count(DISTINCT y.identity) AS retained_count
        FROM daily_actives t LEFT JOIN daily_actives y ON y.identity = t.identity AND y.day = t.day - interval '1 day'
        WHERE t.day >= date_trunc('day', p_start) GROUP BY t.day
      )
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', to_char(day, 'YYYY-MM-DD'), 'active', active_count,
        'retention_pct', CASE WHEN active_count = 0 THEN 0 ELSE round(retained_count::numeric / active_count * 100, 1) END
      ) ORDER BY day), '[]'::jsonb)
      FROM per_day
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_user_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_user_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_user_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ============================================================
-- 3. Geographic Analytics
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_geo_stats(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'by_state', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.revenue_cents DESC), '[]'::jsonb) FROM (
        SELECT o.shipping_address->>'state' AS state, count(*) AS orders,
          count(DISTINCT o.user_id) AS customers, COALESCE(sum(o.total_cents), 0) AS revenue_cents
        FROM public.orders o
        WHERE o.payment_status = 'paid' AND o.fulfillment_type = 'delivery'
          AND o.created_at >= p_start AND o.created_at <= p_end AND o.shipping_address->>'state' IS NOT NULL
        GROUP BY o.shipping_address->>'state'
      ) t
    ),
    'by_city', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.revenue_cents DESC), '[]'::jsonb) FROM (
        SELECT o.shipping_address->>'city' AS city, o.shipping_address->>'state' AS state,
          count(*) AS orders, COALESCE(sum(o.total_cents), 0) AS revenue_cents
        FROM public.orders o
        WHERE o.payment_status = 'paid' AND o.fulfillment_type = 'delivery'
          AND o.created_at >= p_start AND o.created_at <= p_end AND o.shipping_address->>'city' IS NOT NULL
        GROUP BY o.shipping_address->>'city', o.shipping_address->>'state'
        ORDER BY sum(o.total_cents) DESC LIMIT 25
      ) t
    ),
    'store_pickup_orders', (
      SELECT count(*) FROM public.orders WHERE payment_status = 'paid' AND fulfillment_type = 'pickup' AND created_at >= p_start AND created_at <= p_end
    ),
    'customers_by_state', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.customers DESC), '[]'::jsonb) FROM (
        SELECT ua.state, count(DISTINCT ua.user_id) AS customers, avg(ua.lat)::float AS avg_lat, avg(ua.lng)::float AS avg_lng
        FROM public.user_addresses ua WHERE ua.state IS NOT NULL GROUP BY ua.state
      ) t
    ),
    'new_registrations_by_state', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.new_registrations DESC), '[]'::jsonb) FROM (
        SELECT ua.state, count(DISTINCT p.id) AS new_registrations
        FROM public.profiles p JOIN public.user_addresses ua ON ua.user_id = p.id AND ua.is_default = true
        WHERE p.created_at >= p_start AND p.created_at <= p_end AND ua.state IS NOT NULL
        GROUP BY ua.state
      ) t
    ),
    'traffic_by_country', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.sessions DESC), '[]'::jsonb) FROM (
        SELECT COALESCE(country, 'Unknown') AS country, count(*) AS sessions,
          count(DISTINCT COALESCE(user_id::text, device_id, id::text)) AS visitors
        FROM public.analytics_sessions WHERE started_at >= p_start AND started_at <= p_end
        GROUP BY country
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_geo_stats(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_geo_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_geo_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ============================================================
-- 4. Traffic Analytics (with optional filters)
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_traffic_stats(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_prev_start TIMESTAMPTZ, p_prev_end TIMESTAMPTZ,
  p_device TEXT DEFAULT NULL, p_browser TEXT DEFAULT NULL, p_source TEXT DEFAULT NULL, p_country TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH sess AS (
    SELECT *,
      CASE
        WHEN referrer IS NULL OR referrer = '' THEN 'direct'
        WHEN utm_source IS NOT NULL AND utm_source != '' THEN 'campaign'
        WHEN referrer ~* '(google|bing|yahoo|duckduckgo|baidu)\.' THEN 'search'
        WHEN referrer ~* '(facebook|instagram|twitter|x\.com|linkedin|pinterest|whatsapp|t\.me)' THEN 'social'
        ELSE 'referral'
      END AS source
    FROM public.analytics_sessions
    WHERE started_at >= p_start AND started_at <= p_end
      AND (p_device IS NULL OR device_type = p_device)
      AND (p_browser IS NULL OR browser = p_browser)
      AND (p_country IS NULL OR country = p_country)
  ),
  sess_f AS (SELECT * FROM sess WHERE (p_source IS NULL OR source = p_source)),
  daily AS (
    SELECT date_trunc('day', d)::date AS day FROM generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') AS d
  ),
  daily_sessions AS (
    SELECT date_trunc('day', started_at)::date AS day, count(*) AS sessions,
      count(DISTINCT COALESCE(user_id::text, device_id, id::text)) AS visitors, sum(page_view_count) AS page_views
    FROM sess_f GROUP BY 1
  )
  SELECT CASE WHEN auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN jsonb_build_object('error', 'Admin access required') ELSE
  jsonb_build_object(
    'total_visitors', (SELECT count(*) FROM sess_f),
    'unique_visitors', (SELECT count(DISTINCT COALESCE(user_id::text, device_id, id::text)) FROM sess_f),
    'sessions', (SELECT count(*) FROM sess_f),
    'sessions_prev', (SELECT count(*) FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end),
    'page_views', (SELECT COALESCE(sum(page_view_count), 0) FROM sess_f),
    'page_views_prev', (SELECT COALESCE(sum(page_view_count), 0) FROM public.analytics_sessions WHERE started_at >= p_prev_start AND started_at <= p_prev_end),
    'avg_session_duration_seconds', (SELECT COALESCE(round(avg(EXTRACT(EPOCH FROM (last_seen_at - started_at)))), 0) FROM sess_f WHERE last_seen_at > started_at),
    'bounce_rate_pct', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE page_view_count <= 1) / count(*), 1) END FROM sess_f),
    'traffic_sources', (
      SELECT COALESCE(jsonb_object_agg(source, cnt), '{}'::jsonb) FROM (SELECT source, count(*) AS cnt FROM sess_f GROUP BY source) s
    ),
    'top_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT e.path, count(*) AS views FROM public.analytics_events e
        JOIN sess_f s ON s.id = e.session_id
        WHERE e.event_type = 'page_view' AND e.path IS NOT NULL
        GROUP BY e.path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'entry_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT entry_path AS path, count(*) AS sessions FROM sess_f WHERE entry_path IS NOT NULL
        GROUP BY entry_path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'exit_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT exit_path AS path, count(*) AS sessions FROM sess_f WHERE exit_path IS NOT NULL
        GROUP BY exit_path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'daily_trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', to_char(daily.day, 'YYYY-MM-DD'), 'sessions', COALESCE(ds.sessions, 0),
        'visitors', COALESCE(ds.visitors, 0), 'page_views', COALESCE(ds.page_views, 0)
      ) ORDER BY daily.day), '[]'::jsonb)
      FROM daily LEFT JOIN daily_sessions ds ON ds.day = daily.day
    )
  ) END;
$$;
REVOKE ALL ON FUNCTION public.analytics_traffic_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_traffic_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_traffic_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 5. Business Analytics
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_business_stats(
  p_start TIMESTAMPTZ, p_end TIMESTAMPTZ, p_prev_start TIMESTAMPTZ, p_prev_end TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'gross_revenue_cents', (SELECT COALESCE(sum(total_cents), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
    'gross_revenue_cents_prev', (SELECT COALESCE(sum(total_cents), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_prev_start AND created_at <= p_prev_end),
    'discount_given_cents', (SELECT COALESCE(sum(discount_cents + bulk_discount_cents), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
    'refunds_cents', (SELECT COALESCE(sum(refund_amount_cents), 0) FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= p_start AND refunded_at <= p_end),
    'refunds_cents_prev', (SELECT COALESCE(sum(refund_amount_cents), 0) FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= p_prev_start AND refunded_at <= p_prev_end),
    'net_revenue_cents', (
      SELECT COALESCE((SELECT sum(total_cents) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end), 0)
        - COALESCE((SELECT sum(refund_amount_cents) FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= p_start AND refunded_at <= p_end), 0)
    ),
    'transactions_total', (SELECT count(*) FROM public.orders WHERE created_at >= p_start AND created_at <= p_end),
    'transactions_successful', (SELECT count(*) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
    'transactions_failed', (SELECT count(*) FROM public.orders WHERE payment_status = 'failed' AND created_at >= p_start AND created_at <= p_end),
    'transactions_failed_prev', (SELECT count(*) FROM public.orders WHERE payment_status = 'failed' AND created_at >= p_prev_start AND created_at <= p_prev_end),
    'refund_count', (SELECT count(*) FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= p_start AND refunded_at <= p_end),
    'avg_order_value_cents', (SELECT COALESCE(round(avg(total_cents)), 0) FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
    'revenue_per_user_cents', (
      SELECT CASE WHEN count(DISTINCT user_id) = 0 THEN 0 ELSE round(sum(total_cents)::numeric / count(DISTINCT user_id)) END
      FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end
    ),
    'wallet_liability_cents', (SELECT COALESCE(sum(amount_cents), 0) FROM public.wallet_transactions),
    'wallet_credits_cents', (SELECT COALESCE(sum(amount_cents), 0) FROM public.wallet_transactions WHERE type IN ('credit', 'refund') AND created_at >= p_start AND created_at <= p_end),
    'wallet_debits_cents', (SELECT COALESCE(abs(sum(amount_cents)), 0) FROM public.wallet_transactions WHERE type = 'debit' AND created_at >= p_start AND created_at <= p_end),
    'coupon_redemptions', (SELECT count(*) FROM public.orders WHERE coupon_code IS NOT NULL AND payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end),
    'payment_method_breakdown', (
      SELECT COALESCE(jsonb_object_agg(payment_method, cnt), '{}'::jsonb)
      FROM (SELECT payment_method, count(*) AS cnt FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end GROUP BY payment_method) s
    ),
    'subscriptions', jsonb_build_object(
      'active', 0, 'new', 0, 'cancelled', 0, 'upgrades', 0, 'downgrades', 0,
      'note', 'This store sells one-time purchases only — there are no subscription products yet.'
    ),
    'revenue_by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', to_char(d.day, 'YYYY-MM-DD'), 'revenue_cents', COALESCE(o.rev, 0),
        'transactions', COALESCE(o.txns, 0), 'refunds_cents', COALESCE(r.refunds, 0)
      ) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') AS d(day)
      LEFT JOIN (SELECT date_trunc('day', created_at) AS day, sum(total_cents) AS rev, count(*) AS txns FROM public.orders WHERE payment_status = 'paid' AND created_at >= p_start AND created_at <= p_end GROUP BY 1) o ON o.day = d.day
      LEFT JOIN (SELECT date_trunc('day', refunded_at) AS day, sum(refund_amount_cents) AS refunds FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= p_start AND refunded_at <= p_end GROUP BY 1) r ON r.day = d.day
    ),
    'top_products', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT oi.product_name, sum(oi.quantity) AS units_sold, sum(oi.quantity * oi.unit_price_cents) AS revenue_cents
        FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
        WHERE o.payment_status = 'paid' AND o.created_at >= p_start AND o.created_at <= p_end
        GROUP BY oi.product_name ORDER BY sum(oi.quantity * oi.unit_price_cents) DESC LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_business_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_business_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_business_stats(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ============================================================
-- 6. Error Analytics
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_error_stats(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'total_errors', (SELECT count(*) FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end),
    'critical_errors', (SELECT count(*) FROM public.error_logs WHERE severity = 'critical' AND created_at >= p_start AND created_at <= p_end),
    'error_rate_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(
        (SELECT count(*) FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end)::numeric / count(*) * 100, 3)
      END FROM public.analytics_events WHERE created_at >= p_start AND created_at <= p_end
    ),
    'http_4xx', (SELECT count(*) FROM public.error_logs WHERE status_code >= 400 AND status_code < 500 AND created_at >= p_start AND created_at <= p_end),
    'http_404', (SELECT count(*) FROM public.error_logs WHERE status_code = 404 AND created_at >= p_start AND created_at <= p_end),
    'http_500', (SELECT count(*) FROM public.error_logs WHERE status_code >= 500 AND created_at >= p_start AND created_at <= p_end),
    'failed_jobs', (SELECT count(*) FROM public.error_logs WHERE error_type = 'job' AND created_at >= p_start AND created_at <= p_end),
    'by_type', (
      SELECT COALESCE(jsonb_object_agg(error_type, cnt), '{}'::jsonb)
      FROM (SELECT error_type, count(*) AS cnt FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end GROUP BY error_type) s
    ),
    'trend', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'errors', COALESCE(e.cnt, 0)) ORDER BY d.day), '[]'::jsonb)
      FROM generate_series(date_trunc('day', p_start), date_trunc('day', p_end), interval '1 day') AS d(day)
      LEFT JOIN (SELECT date_trunc('day', created_at) AS day, count(*) AS cnt FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end GROUP BY 1) e ON e.day = d.day
    ),
    'top_errors', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT error_type, message, path, severity, count(*) AS occurrences,
          min(created_at) AS first_seen, max(created_at) AS last_seen, bool_and(resolved) AS resolved
        FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end
        GROUP BY error_type, message, path, severity ORDER BY count(*) DESC LIMIT 20
      ) t
    ),
    'by_page', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT COALESCE(path, '(unknown)') AS path, count(*) AS occurrences FROM public.error_logs
        WHERE created_at >= p_start AND created_at <= p_end GROUP BY path ORDER BY count(*) DESC LIMIT 10
      ) t
    ),
    'by_device', (
      SELECT COALESCE(jsonb_object_agg(COALESCE(device_type, 'unknown'), cnt), '{}'::jsonb)
      FROM (SELECT device_type, count(*) AS cnt FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end GROUP BY device_type) s
    ),
    'by_browser', (
      SELECT COALESCE(jsonb_object_agg(COALESCE(browser, 'unknown'), cnt), '{}'::jsonb)
      FROM (SELECT browser, count(*) AS cnt FROM public.error_logs WHERE created_at >= p_start AND created_at <= p_end GROUP BY browser) s
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_error_stats(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_error_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_error_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

-- ============================================================
-- 7. Real-Time Analytics
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_realtime_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('error', 'Admin access required');
  END IF;

  SELECT jsonb_build_object(
    'online_now', (SELECT count(*) FROM public.analytics_sessions WHERE last_seen_at >= now() - interval '5 minutes'),
    'active_sessions_30m', (SELECT count(*) FROM public.analytics_sessions WHERE last_seen_at >= now() - interval '30 minutes'),
    'new_registrations_today', (SELECT count(*) FROM public.profiles WHERE created_at >= date_trunc('day', now())),
    'checkout_activity_15m', (SELECT count(*) FROM public.orders WHERE created_at >= now() - interval '15 minutes'),
    'page_activity_5m', (SELECT count(*) FROM public.analytics_events WHERE created_at >= now() - interval '5 minutes'),
    'errors_15m', (SELECT count(*) FROM public.error_logs WHERE created_at >= now() - interval '15 minutes'),
    'current_pages', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT path, count(*) AS viewers FROM public.analytics_events
        WHERE created_at >= now() - interval '5 minutes' AND path IS NOT NULL
        GROUP BY path ORDER BY count(*) DESC LIMIT 8
      ) t
    ),
    'live_transactions', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) FROM (
        SELECT id, customer_name, total_cents, payment_status, created_at FROM public.orders ORDER BY created_at DESC LIMIT 10
      ) t
    ),
    'live_errors', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) FROM (
        SELECT id, error_type, severity, message, path, created_at FROM public.error_logs ORDER BY created_at DESC LIMIT 10
      ) t
    ),
    'activity_feed', (
      SELECT COALESCE(jsonb_agg(f ORDER BY f.at DESC), '[]'::jsonb) FROM (
        (SELECT 'order' AS kind, 'New order · ' || COALESCE(customer_name, 'Customer') || ' · ' || to_char(total_cents / 100.0, 'FM999999990.00') AS text, created_at AS at
         FROM public.orders ORDER BY created_at DESC LIMIT 15)
        UNION ALL
        (SELECT 'registration' AS kind, 'New account registered' AS text, created_at AS at FROM public.profiles ORDER BY created_at DESC LIMIT 15)
        UNION ALL
        (SELECT 'error' AS kind, 'Error · ' || left(message, 80) AS text, created_at AS at FROM public.error_logs ORDER BY created_at DESC LIMIT 15)
        UNION ALL
        (SELECT 'return' AS kind, 'Return requested' AS text, created_at AS at FROM public.return_requests ORDER BY created_at DESC LIMIT 10)
        ORDER BY at DESC LIMIT 25
      ) f
    )
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_realtime_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_realtime_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_realtime_snapshot() TO service_role;

-- ============================================================
-- 8. Alert evaluation — service-role only, see header note
-- ============================================================
CREATE OR REPLACE FUNCTION public.analytics_evaluate_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  window_start TIMESTAMPTZ;
  prev_window_start TIMESTAMPTZ;
  current_value NUMERIC;
  previous_value NUMERIC;
  is_triggered BOOLEAN;
  existing_event_id UUID;
  newly_triggered JSONB := '[]'::JSONB;
  event_message TEXT;
BEGIN
  FOR rule IN SELECT * FROM public.analytics_alert_rules WHERE enabled = true LOOP
    window_start := now() - (rule.time_window_minutes || ' minutes')::INTERVAL;
    prev_window_start := window_start - (rule.time_window_minutes || ' minutes')::INTERVAL;

    current_value := COALESCE(CASE rule.metric
      WHEN 'traffic' THEN (SELECT count(*)::NUMERIC FROM public.analytics_sessions WHERE started_at >= window_start)
      WHEN 'error_rate' THEN (
        SELECT CASE WHEN count(*) = 0 THEN 0 ELSE
          (SELECT count(*) FROM public.error_logs WHERE created_at >= window_start)::NUMERIC / count(*) * 100
        END FROM public.analytics_events WHERE created_at >= window_start
      )
      WHEN 'revenue' THEN (SELECT COALESCE(sum(total_cents), 0)::NUMERIC FROM public.orders WHERE payment_status = 'paid' AND created_at >= window_start)
      WHEN 'failed_transactions' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE payment_status = 'failed' AND created_at >= window_start)
      WHEN 'new_registrations' THEN (SELECT count(*)::NUMERIC FROM public.profiles WHERE created_at >= window_start)
      WHEN 'api_traffic' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE created_at >= window_start)
      WHEN 'system_errors' THEN (SELECT count(*)::NUMERIC FROM public.error_logs WHERE severity IN ('critical', 'error') AND created_at >= window_start)
      WHEN 'refunds' THEN (SELECT count(*)::NUMERIC FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= window_start)
      ELSE 0
    END, 0);

    previous_value := COALESCE(CASE rule.metric
      WHEN 'traffic' THEN (SELECT count(*)::NUMERIC FROM public.analytics_sessions WHERE started_at >= prev_window_start AND started_at < window_start)
      WHEN 'error_rate' THEN (
        SELECT CASE WHEN count(*) = 0 THEN 0 ELSE
          (SELECT count(*) FROM public.error_logs WHERE created_at >= prev_window_start AND created_at < window_start)::NUMERIC / count(*) * 100
        END FROM public.analytics_events WHERE created_at >= prev_window_start AND created_at < window_start
      )
      WHEN 'revenue' THEN (SELECT COALESCE(sum(total_cents), 0)::NUMERIC FROM public.orders WHERE payment_status = 'paid' AND created_at >= prev_window_start AND created_at < window_start)
      WHEN 'failed_transactions' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE payment_status = 'failed' AND created_at >= prev_window_start AND created_at < window_start)
      WHEN 'new_registrations' THEN (SELECT count(*)::NUMERIC FROM public.profiles WHERE created_at >= prev_window_start AND created_at < window_start)
      WHEN 'api_traffic' THEN (SELECT count(*)::NUMERIC FROM public.orders WHERE created_at >= prev_window_start AND created_at < window_start)
      WHEN 'system_errors' THEN (SELECT count(*)::NUMERIC FROM public.error_logs WHERE severity IN ('critical', 'error') AND created_at >= prev_window_start AND created_at < window_start)
      WHEN 'refunds' THEN (SELECT count(*)::NUMERIC FROM public.return_requests WHERE status = 'refunded' AND refunded_at >= prev_window_start AND refunded_at < window_start)
      ELSE 0
    END, 0);

    is_triggered := CASE rule.condition
      WHEN 'above' THEN current_value > rule.threshold
      WHEN 'below' THEN current_value < rule.threshold
      WHEN 'spike_pct' THEN previous_value > 0 AND ((current_value - previous_value) / previous_value * 100) > rule.threshold
      WHEN 'drop_pct' THEN previous_value > 0 AND ((previous_value - current_value) / previous_value * 100) > rule.threshold
      ELSE false
    END;

    SELECT id INTO existing_event_id FROM public.analytics_alert_events
      WHERE rule_id = rule.id AND status = 'triggered' ORDER BY triggered_at DESC LIMIT 1;

    IF is_triggered AND existing_event_id IS NULL THEN
      event_message := rule.name || ' — ' || rule.metric || ' is ' || round(current_value, 2)::TEXT ||
        CASE WHEN rule.condition IN ('above', 'below') THEN ' (threshold ' || rule.threshold::TEXT || ')'
        ELSE ' (' || round(CASE WHEN previous_value > 0 THEN abs(current_value - previous_value) / previous_value * 100 ELSE 0 END, 1)::TEXT || '% vs prior window)' END;

      INSERT INTO public.analytics_alert_events (rule_id, value, message, status)
      VALUES (rule.id, current_value, event_message, 'triggered');

      newly_triggered := newly_triggered || jsonb_build_object(
        'rule_id', rule.id, 'name', rule.name, 'severity', rule.severity,
        'message', event_message, 'notify_channels', to_jsonb(rule.notify_channels)
      );
    ELSIF NOT is_triggered AND existing_event_id IS NOT NULL THEN
      UPDATE public.analytics_alert_events SET status = 'resolved', resolved_at = now() WHERE id = existing_event_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('newly_triggered', newly_triggered);
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_evaluate_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_evaluate_alerts() TO service_role;
