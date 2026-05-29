import { Suspense } from "react";
import { HallOfFameSection } from "@/components/home/hall-of-fame-section";
import { HomePageClient } from "@/components/home/home-page-client";
import { getHallOfFame } from "@/lib/hall-of-fame";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  return (
    <>
      <HomePageClient />
      <Suspense fallback={<HallOfFameSkeleton />}>
        <HallOfFameSectionServer />
      </Suspense>
    </>
  );
}

async function HallOfFameSectionServer() {
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
    <HallOfFameSection
      leaderboard={leaderboard}
      isLoggedIn={Boolean(user)}
      profile={profile}
    />
  );
}

function HallOfFameSkeleton() {
  return (
    <section className="container mx-auto max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="h-7 w-32 animate-pulse rounded-full bg-muted" />
              <div className="h-8 w-80 animate-pulse rounded bg-muted" />
              <div className="h-4 w-[32rem] max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="h-12 w-full max-w-sm animate-pulse rounded-2xl bg-muted" />
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-border/60 bg-background/75 px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="h-12 w-40 animate-pulse rounded-2xl bg-muted" />
                  <div className="h-8 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
