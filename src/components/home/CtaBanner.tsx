import { CtaBanner, DefaultCtaActions } from '@/components/shared/CtaBanner';

/** The homepage's copy for the shared jewel-tone banner. */
export function HomeCtaBanner() {
  return (
    <CtaBanner
      eyebrow="Accelerate Pipeline"
      title="Ready to scale your business?"
      description="Whether you need a high-converting web app or a comprehensive digital marketing strategy, I'm here to help you dominate your market."
      actions={<DefaultCtaActions />}
    />
  );
}

export { ClosingCta } from '@/components/shared/CtaBanner';
