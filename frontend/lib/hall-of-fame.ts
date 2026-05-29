import { createClient } from "@/lib/supabase/server";
import type { HallOfFamePeriod, HallOfFameRow } from "@/lib/types/database";

export const HALL_OF_FAME_PERIODS: HallOfFamePeriod[] = ["week", "month", "all"];

export type HallOfFameMap = Record<HallOfFamePeriod, HallOfFameRow[]>;

export async function getHallOfFame(limit = 10): Promise<HallOfFameMap> {
  const supabase = await createClient();
  const typedSupabase = supabase as unknown as {
    rpc: (
      fn: "get_hall_of_fame",
      args: { period_key: HallOfFamePeriod; entry_limit: number }
    ) => Promise<{ data: HallOfFameRow[] | null; error: { message: string } | null }>
  };

  const entries = await Promise.all(
    HALL_OF_FAME_PERIODS.map(async (period) => {
      const { data, error } = await typedSupabase.rpc("get_hall_of_fame", {
        period_key: period,
        entry_limit: limit,
      });

      if (error) {
        console.error(`Hall of fame fetch failed for ${period}:`, error);
        return [period, []] as const;
      }

      return [period, (data ?? []) as HallOfFameRow[]] as const;
    })
  );

  return Object.fromEntries(entries) as HallOfFameMap;
}
