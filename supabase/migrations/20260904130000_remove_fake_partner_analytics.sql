-- The public Partners page used to fabricate 'signup_offer'/'convert_offer'
-- activity_logs rows via Math.random() coin-flips on every offer click,
-- which Partner Analytics then charted as if they were real conversion
-- data (see src/routes/partners/index.tsx's handleClaimOffer, now fixed to
-- only log the real 'click_offer' event). This cleans up the historical
-- fake rows that code already wrote - they aren't real user activity and
-- have no other consumer (confirmed: no other code reads these two action
-- values), so nothing legitimate depends on keeping them.
DELETE FROM public.activity_logs
WHERE module = 'partners' AND action IN ('signup_offer', 'convert_offer');
