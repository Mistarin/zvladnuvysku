import { HallOfFameSection } from "@/components/home/hall-of-fame-section";
import { HomePageClient } from "@/components/home/home-page-client";
import { getHallOfFame } from "@/lib/hall-of-fame";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const [
    leaderboard,
    {
      data: { user },
    },
  ] = await Promise.all([
    getHallOfFame(10),
    supabase.auth.getUser(),
  ]);

  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data ?? null
    : null;

  return (
    <>
      <HomePageClient />
      <HallOfFameSection
        leaderboard={leaderboard}
        isLoggedIn={Boolean(user)}
        profile={profile}
      />
    </>
  );
}
