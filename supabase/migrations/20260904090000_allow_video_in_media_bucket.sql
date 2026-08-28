-- The 'media' bucket was created image-only (5MB limit, image/* mime types),
-- so the page builder's video-background upload silently fails at the
-- storage layer - not a rendering bug, the file never actually uploads.
-- Widen it to also accept video, with a larger size limit for that media type.
UPDATE storage.buckets
SET
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ],
    file_size_limit = 104857600 -- 100MB, up from 5MB
WHERE id = 'media';
