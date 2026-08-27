-- Bug fixes found in code review: schema/RLS gaps that break intended
-- functionality or allow unauthorized access. See app-code changes in the
-- same change for the corresponding client/server fixes.

-- 1. invoices.status CHECK constraint didn't allow the values the app
--    actually writes ('unpaid' on payment_failed, 'refunded' on refund).
--    Both writes would throw a Postgres error, most seriously after a
--    Stripe refund had already been executed (see refund.functions.ts).
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'paid', 'void', 'unpaid', 'refunded'));

-- 2. contact_messages had RLS enabled with no INSERT policy at all, so
--    every "New Inquiry" / contact-form submission failed. Also no SELECT
--    policy for the message's own author, so a client's inquiry history
--    always showed empty.
CREATE POLICY "Anyone can submit a contact message" ON public.contact_messages
    FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Users can view their own messages" ON public.contact_messages
    FOR SELECT TO authenticated USING (email = (auth.jwt() ->> 'email'));

-- 3. activity_logs had RLS enabled with no INSERT policy, so every
--    client-side logActivity() call (audit.ts) silently failed, and no
--    SELECT policy for a message/document's own owner, so the client
--    "View Activity" dialog always showed empty.
CREATE POLICY "Authenticated users can log their own activity" ON public.activity_logs
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own activity" ON public.activity_logs
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. service_quotes only allowed INSERT from the anon role; a logged-in
--    client submitting the quote form got an RLS violation.
CREATE POLICY "Authenticated users can submit a quote" ON public.service_quotes
    FOR INSERT TO authenticated WITH CHECK (true);

-- 5. gig_reviews INSERT policy only checked auth.uid() = user_id, never
--    that order_id actually belongs to a completed order for that gig
--    owned by the caller - so anyone could forge an order_id and an
--    is_verified_purchase=true "Verified Purchase" badge. There was also
--    no UNIQUE constraint on order_id, so the app's existing duplicate-
--    review handling (Postgres error 23505) was unreachable dead code.
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.gig_reviews;
CREATE POLICY "Users can insert their own reviews" ON public.gig_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND (
            order_id IS NULL
            OR EXISTS (
                SELECT 1 FROM public.orders o
                JOIN public.gig_packages gp ON gp.id = o.package_id
                WHERE o.id = gig_reviews.order_id
                  AND o.user_id = auth.uid()
                  AND o.status = 'completed'
                  AND gp.gig_id = gig_reviews.gig_id
            )
        )
        AND (
            is_verified_purchase IS NOT TRUE
            OR EXISTS (
                SELECT 1 FROM public.orders o
                JOIN public.gig_packages gp ON gp.id = o.package_id
                WHERE o.id = gig_reviews.order_id
                  AND o.user_id = auth.uid()
                  AND o.status = 'completed'
                  AND gp.gig_id = gig_reviews.gig_id
            )
        )
    );

CREATE UNIQUE INDEX IF NOT EXISTS gig_reviews_order_id_unique
    ON public.gig_reviews (order_id) WHERE order_id IS NOT NULL;

-- 6. conversation_participants_insert allowed any authenticated user to
--    insert themselves as a participant into ANY conversation (just by
--    knowing/guessing its id), letting them read private conversations.
--    The only real insert path (Messenger.tsx creating a conversation)
--    already goes through the "creator" branch below, so this branch was
--    both a security hole and unused by app functionality.
DROP POLICY IF EXISTS "participants_insert" ON public.conversation_participants;
CREATE POLICY "participants_insert" ON public.conversation_participants FOR INSERT TO authenticated
    WITH CHECK (
        public.is_staff(auth.uid())
        OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
    );

-- 7. webhook_logs had no unique constraint on event_id, so a Stripe retry
--    of the same event could be processed more than once. Supports the
--    idempotency check added in stripe-webhook.ts.
CREATE UNIQUE INDEX IF NOT EXISTS webhook_logs_event_id_unique
    ON public.webhook_logs (event_id);
