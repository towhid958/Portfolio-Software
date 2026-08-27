-- Grant access to partners
GRANT SELECT ON public.partners TO anon;
GRANT SELECT ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;

-- Grant access to offers
GRANT SELECT ON public.offers TO anon;
GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
