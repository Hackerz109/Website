-- avatars and product-images are public buckets accessed everywhere in the
-- app via getPublicUrl() (a direct object URL, which public buckets serve
-- regardless of RLS) — the app's own code never calls storage's list()/
-- SELECT API for either bucket. The broad SELECT policies below only ever
-- enabled *listing* every file in the bucket, which for avatars meant any
-- signed-in user could enumerate every other user's id (avatars are
-- stored under a path starting with the owner's raw user id). Dropping
-- them removes that enumeration surface with zero effect on how images
-- actually get displayed — any URL the app already generates keeps
-- working exactly as before.
DROP POLICY IF EXISTS "read avatars" ON storage.objects;
DROP POLICY IF EXISTS "public read product images bucket" ON storage.objects;
