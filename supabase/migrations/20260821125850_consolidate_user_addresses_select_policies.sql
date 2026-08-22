-- "manage own addresses" (FOR ALL) and "admin read addresses" (FOR SELECT)
-- both apply to authenticated SELECTs, so every address lookup runs two
-- USING clauses and ORs them. Splitting "manage own addresses" into its
-- three non-SELECT commands and folding both SELECT conditions into one
-- policy keeps identical access (owner: full CRUD on their own rows only;
-- admin: read-only across all rows, same as before) with one policy per
-- command instead of two on SELECT.
DROP POLICY "manage own addresses" ON public.user_addresses;
DROP POLICY "admin read addresses" ON public.user_addresses;

CREATE POLICY "read own or admin addresses" ON public.user_addresses
  FOR SELECT
  USING ((select auth.uid()) = user_id OR has_role((select auth.uid()), 'admin'::app_role));

CREATE POLICY "insert own addresses" ON public.user_addresses
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own addresses" ON public.user_addresses
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own addresses" ON public.user_addresses
  FOR DELETE
  USING ((select auth.uid()) = user_id);
