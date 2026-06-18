import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCinematicDna = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { buildCinematicDna } = await import("./dna.server");
    return buildCinematicDna({ userId: context.userId, supabase: context.supabase });
  });

export const logDnaShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { channel: string; animalKey?: string; characterKey?: string; rarity?: string }) =>
    z.object({
      channel: z.string().min(1).max(40),
      animalKey: z.string().max(40).optional(),
      characterKey: z.string().max(40).optional(),
      rarity: z.string().max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("dna_shares").insert({
      user_id: context.userId,
      channel: data.channel,
      animal_key: data.animalKey ?? null,
      character_key: data.characterKey ?? null,
      rarity: data.rarity ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
