import { redirect } from "next/navigation";
import { getPublicProfilePath } from "@/lib/public-profile";

// The /prispevky sub-page is now merged into the main profile page.
// Redirect permanently to the parent profile.
export default async function PublicProfileContributionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(getPublicProfilePath(userId));
}
