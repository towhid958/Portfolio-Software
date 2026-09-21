import { Reveal } from '@/components/motion/Reveal';

type SectionHeadingProps = {
  /** Small pill above the title. */
  eyebrow: string;
  title: string;
  description?: string;
  /** Pills sit on different backgrounds across sections (white vs tinted). */
  eyebrowClassName?: string;
};

/**
 * Eyebrow + title + gradient rule + lede.
 *
 * The homepage established this rhythm for Services and Expertise; every
 * inner page now reuses it so section breaks read the same everywhere.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  eyebrowClassName = 'border-royal-deep/15 bg-white shadow-sm',
}: SectionHeadingProps) {
  return (
    <Reveal className="mx-auto mb-16 flex max-w-2xl flex-col items-center space-y-3.5 text-center">
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-mono-code text-[11px] font-bold uppercase tracking-wider text-royal-deep ${eyebrowClassName}`}
      >
        {eyebrow}
      </div>
      <h2 className="font-sans-body text-3xl font-extrabold tracking-tight text-royal-ink lg:text-4xl">
        {title}
      </h2>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-royal-deep via-royal-gold to-royal-sapphire" />
      {description && (
        <p className="pt-1 text-base leading-relaxed text-slate-600">{description}</p>
      )}
    </Reveal>
  );
}
