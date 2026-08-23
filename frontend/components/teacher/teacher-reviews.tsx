import { createClient } from "@/lib/supabase/server";
import { ReportIssueDialog } from "@/components/feedback/report-issue-dialog";
import { PublicUserLink } from "@/components/profile/public-user-link";
import { getPublicUserSummaryMap } from "@/lib/public-user-summaries";
import type { Database } from "@/lib/types/database";

type PublicTeacherReview = Database["public"]["Tables"]["public_teacher_reviews"]["Row"];

export async function TeacherReviews({ teacherId }: { teacherId: string }) {
  const supabase = await createClient();

  const { data: reviews, error } = await supabase
    .from("public_teacher_reviews")
    .select("id, rating, review, created_at, author_user_id, is_anonymous")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-destructive text-sm">Nepodařilo se načíst recenze.</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 surface-card">
        <p className="text-muted-foreground">Tento vyučující zatím nemá žádné recenze.</p>
        <p className="text-sm text-muted-foreground mt-1">Buďte první!</p>
      </div>
    );
  }

  const typedReviews = reviews as PublicTeacherReview[];
  const reviewerSummaries = await getPublicUserSummaryMap(
    typedReviews.map((review) => review.author_user_id).filter((value): value is string => Boolean(value)),
    supabase,
  );

  return (
    <div className="space-y-4">
      {typedReviews.map((review) => (
        <div key={review.id} className="surface-card p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="space-y-2 min-w-0">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={star <= review.rating ? "text-yellow-400" : "text-muted opacity-40 grayscale"}
                  >

                  </span>
                ))}
              </div>
              {review.author_user_id ? (
                <PublicUserLink
                  userId={review.author_user_id}
                  summary={reviewerSummaries[review.author_user_id] ?? null}
                  fallbackLabel="Student"
                />
              ) : (
                <span className="text-sm text-muted-foreground">Anonymní recenze</span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString("cs-CZ")}
            </span>
          </div>
          <div className="space-y-3">
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {review.review}
            </p>
            <ReportIssueDialog
              sourceType="teacher_rating"
              sourceId={review.id}
              sourceLabel="Recenze vyučujícího"
              compact
            />
          </div>
        </div>
      ))}
    </div>
  );
}
