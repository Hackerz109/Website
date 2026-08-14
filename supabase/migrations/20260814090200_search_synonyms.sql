-- Admin-editable synonym pairs so a search for one term also matches
-- products described with the other (e.g. "wire" also finds products
-- described as "cable"). search_products_ranked tokenizes the query on
-- whitespace and looks up EACH WORD individually against this table, so
-- every term/synonym here is a single token by design — a multi-word
-- value would never match. Both directions are inserted explicitly so the
-- lookup stays a simple equality check either way. Table is admin-managed
-- (read is public since it's used at query time from an anon-callable
-- search function); seed list is scoped to this catalog's actual
-- category/brand vocabulary (Ac Boxes, Ceiling Fans, Coolers, Fresh Air
-- Plastic Exhausts, Indicators, LED Bulbs, LED Tube Light Fittings,
-- MCBs/Mini MCBs, Modular/Blank Plates, Regulators, Sockets, Switches,
-- Water Pumps, Wires) plus a couple of common India-market terms —
-- verified against live data before seeding.

CREATE TABLE public.search_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  synonym TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term, synonym)
);

GRANT SELECT ON public.search_synonyms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.search_synonyms TO authenticated;
GRANT ALL ON public.search_synonyms TO service_role;

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read synonyms" ON public.search_synonyms
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "admin insert synonyms" ON public.search_synonyms
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update synonyms" ON public.search_synonyms
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin delete synonyms" ON public.search_synonyms
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.search_synonyms (term, synonym) VALUES
  ('mcb', 'breaker'), ('breaker', 'mcb'),
  ('wire', 'cable'), ('cable', 'wire'),
  ('bulb', 'lamp'), ('lamp', 'bulb'),
  ('tubelight', 'batten'), ('batten', 'tubelight'),
  ('regulator', 'dimmer'), ('dimmer', 'regulator'),
  ('socket', 'plug'), ('plug', 'socket'),
  ('switchboard', 'plate'), ('plate', 'switchboard'),
  ('acbox', 'db'), ('db', 'acbox'),
  ('fan', 'pankha'), ('pankha', 'fan'),
  ('geyser', 'heater'), ('heater', 'geyser'),
  ('pump', 'motor'), ('motor', 'pump'),
  ('exhaust', 'ventilation'), ('ventilation', 'exhaust'),
  ('indicator', 'pilot'), ('pilot', 'indicator');
