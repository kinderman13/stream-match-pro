
DROP POLICY IF EXISTS "users insert own logs" ON public.system_logs;
CREATE POLICY "users insert own logs" ON public.system_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "msgs_insert_participant_or_admin" ON public.support_messages;
CREATE POLICY "msgs_insert_participant_or_admin" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (has_role(auth.uid(), 'admin'::app_role) AND sender_role = 'admin')
      OR (
        NOT has_role(auth.uid(), 'admin'::app_role)
        AND sender_role = 'user'
        AND EXISTS (
          SELECT 1 FROM support_tickets t
          WHERE t.id = support_messages.ticket_id AND t.user_id = auth.uid()
        )
      )
    )
  );
