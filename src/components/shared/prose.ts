/**
 * Typography for admin-authored rich text (blog posts, project write-ups,
 * service descriptions).
 *
 * The @tailwindcss/typography defaults are grey-on-white and use the base
 * font, which made article bodies the one place on the public site that
 * didn't look like the rest of it. These modifiers pull headings onto the
 * display font and links/quotes onto the royal palette.
 */
export const proseRoyal = [
  'prose max-w-none',
  'prose-headings:font-sans-body prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-royal-ink',
  'prose-p:leading-relaxed prose-p:text-slate-600',
  'prose-li:text-slate-600 prose-li:marker:text-royal-gold',
  'prose-strong:text-royal-ink',
  'prose-a:font-semibold prose-a:text-royal-sapphire prose-a:no-underline hover:prose-a:text-royal-gold-deep hover:prose-a:underline',
  'prose-blockquote:rounded-r-xl prose-blockquote:border-l-4 prose-blockquote:border-royal-gold prose-blockquote:bg-royal-canvas-alt prose-blockquote:py-1 prose-blockquote:pl-5 prose-blockquote:not-italic prose-blockquote:text-royal-ink',
  'prose-code:rounded prose-code:bg-royal-deep/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono-code prose-code:text-royal-deep prose-code:before:content-none prose-code:after:content-none',
  'prose-pre:rounded-2xl prose-pre:border prose-pre:border-royal-gold/25 prose-pre:bg-royal-navy',
  'prose-img:rounded-2xl prose-img:border prose-img:border-royal-deep/12',
  'prose-hr:border-royal-deep/10',
].join(' ');
