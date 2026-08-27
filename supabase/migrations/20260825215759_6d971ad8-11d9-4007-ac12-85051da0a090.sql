-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  type text NOT NULL DEFAULT 'direct',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  attachment_url text,
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);
CREATE INDEX idx_participants_user ON public.conversation_participants (user_id);

-- Helper (security definer, avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','admin','editor','staff')
  )
$$;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_participant(id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "conversations_delete" ON public.conversations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "participants_select" ON public.conversation_participants FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "participants_insert" ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );
CREATE POLICY "participants_update" ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "participants_delete" ON public.conversation_participants FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );

CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()) OR public.is_staff(auth.uid()));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND (public.is_conversation_participant(conversation_id, auth.uid()) OR public.is_staff(auth.uid())));
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Bump conversation activity when a message arrives
CREATE OR REPLACE FUNCTION public.bump_conversation_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER messages_bump_conversation AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_activity();

-- Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Demo seed
DO $$
DECLARE
  admin_id uuid;
  client_id uuid;
  c_direct uuid;
  c_group uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'kamrulhasan.freelancer@gmail.com';
  SELECT id INTO client_id FROM auth.users WHERE email = 'optosoftit@gmail.com';

  IF admin_id IS NOT NULL AND client_id IS NOT NULL THEN
    INSERT INTO public.conversations (title, type, created_by, last_message_at)
    VALUES ('Direct Chat', 'direct', admin_id, now() - interval '2 hours')
    RETURNING id INTO c_direct;

    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (c_direct, admin_id, 'owner'), (c_direct, client_id, 'member');

    INSERT INTO public.messages (conversation_id, sender_id, body, created_at) VALUES
      (c_direct, admin_id, 'Hi! Welcome to your private support channel. How can I help today?', now() - interval '3 hours'),
      (c_direct, client_id, 'Thanks! I wanted to check the timeline for the Shopify migration.', now() - interval '2 hours 30 minutes'),
      (c_direct, admin_id, 'We are on track — staging goes live Friday and I will share the review link here.', now() - interval '2 hours');

    INSERT INTO public.conversations (title, type, created_by, last_message_at)
    VALUES ('Shopify Migration Team', 'group', admin_id, now() - interval '40 minutes')
    RETURNING id INTO c_group;

    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (c_group, admin_id, 'owner'), (c_group, client_id, 'member');

    INSERT INTO public.messages (conversation_id, sender_id, body, created_at) VALUES
      (c_group, admin_id, 'Kicking off the migration group — design, dev and QA updates land here.', now() - interval '1 day'),
      (c_group, client_id, 'Perfect. I uploaded the brand assets to the document vault.', now() - interval '5 hours'),
      (c_group, admin_id, 'Got them, thank you. Theme setup is 60% complete.', now() - interval '40 minutes');
  END IF;
END $$;