import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCinematicDna = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildCinematicDna } = await import("./dna.server");
    return buildCinematicDna({ userId: context.userId, supabase: context.supabase });
  });
