# Images

Drop your image files in this folder (this folder, or subfolders like `hero/`, `services/`).

Files here are served from the site root, so a file at:

    public/images/hero.jpg

is referenced in code as:

    <img src="/images/hero.jpg" alt="..." />

Notes:
- The path always starts with `/images/...` — do NOT include `public/`.
- Use lowercase, hyphenated filenames (`team-photo.jpg`, not `Team Photo.jpg`).
- Prefer `.webp` or optimized `.jpg` for photos, `.svg` for logos/icons.
- Subfolders are fine: `public/images/hero/bg.webp` -> `/images/hero/bg.webp`.
