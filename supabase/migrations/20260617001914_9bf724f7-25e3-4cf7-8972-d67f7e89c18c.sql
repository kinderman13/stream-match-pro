
CREATE TYPE public.support_category AS ENUM ('bug','feature','question','content_report','contact');
CREATE TYPE public.support_status AS ENUM ('open','in_review','answered','closed');

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.support_category NOT NULL,
  subject text NOT NULL,
  status public.support_status NOT NULL DEFAULT 'open',
  attachment_url text,
  user_unread_count integer NOT NULL DEFAULT 0,
  admin_unread_count integer NOT NULL DEFAULT 1,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_tickets_user_idx ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX support_tickets_status_idx ON public.support_tickets(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_select_own_or_admin" ON public.support_tickets FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tickets_insert_own" ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_update_admin" ON public.support_tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  body text NOT NULL,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msgs_select_participant_or_admin" ON public.support_messages FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
);
CREATE POLICY "msgs_insert_participant_or_admin" ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  )
);
