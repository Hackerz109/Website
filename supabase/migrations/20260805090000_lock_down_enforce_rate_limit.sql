-- enforce_rate_limit(scope, identifier, limit, window, lock_seconds) took
-- every parameter directly from the caller with no check on who was
-- calling — meaning anyone, signed in or not, could call it directly via
-- /rest/v1/rpc/enforce_rate_limit and deliberately trip the lock for ANY
-- identifier in ANY scope (e.g. scope='login', identifier='email:
-- <anyone>@example.com', limit=1, lock_seconds=<huge>) — a one-request
-- denial-of-service against a specific person's login, checkout coupon
-- entry, support access, or anything else that shares this rate limiter.
-- It's only ever meant to be called from inside other SECURITY DEFINER
-- functions (add_support_message, create_support_ticket) that already did
-- their own auth checks first — those internal calls run as the function
-- owner (postgres) and are unaffected by this revoke, since owners always
-- retain implicit execute rights on their own objects.
REVOKE EXECUTE ON FUNCTION public.enforce_rate_limit(text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(text, text, integer, integer, integer) TO service_role;
