import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pingActivity } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Calls touch_last_seen() at most once per 5 minutes while a user is signed in.
 */
export function useActivityPing() {
  const ping = useServerFn(pingActivity);
  useEffect(() => {
    let last = 0;
    const INTERVAL = 5 * 60_000;
    async function maybePing() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      if (Date.now() - last < INTERVAL) return;
      last = Date.now();
      ping().catch(() => null);
    }
    maybePing();
    const id = setInterval(maybePing, INTERVAL);
    const onFocus = () => maybePing();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [ping]);
}
