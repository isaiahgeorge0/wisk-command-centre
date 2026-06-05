-- Multi-platform support for content posts (platform column kept as fallback)

ALTER TABLE public.content_posts
ADD COLUMN platforms text[] DEFAULT '{}';

UPDATE public.content_posts
SET platforms = ARRAY[platform]
WHERE platform IS NOT NULL AND platform != '';

CREATE INDEX content_posts_platforms_gin ON public.content_posts USING GIN (platforms);
