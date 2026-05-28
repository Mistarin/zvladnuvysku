import { createClient } from "@/lib/supabase/server";

export async function TeacherReviews({ teacherId }: { teacherId: string }) {
  const supabase = await createClient();

  const { data: reviews, error } = await supabase
    .from("teacher_ratings")
    .select("id, rating, review, created_at")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) {
    return <div className="text-destructive text-sm">Nepodařilo se načíst recenze.</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 glass-card">
        <p className="text-muted-foreground">Tento vyučující zatím nemá žádné recenze.</p>
        <p className="text-sm text-muted-foreground mt-1">Buďte první!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(reviews as any[]).map((review) => (
        <div key={review.id} className="glass-card p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star} 
                  className={star <= (review.rating || 0) ? "text-yellow-400" : "text-muted opacity-40 grayscale"}
                >
                  ⭐
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(review.created_at).toLocaleDateString("cs-CZ")}
            </span>
          </div>
          {review.review ? (
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {review.review}
            </p>
          ) : (
            <p className="text-muted-foreground/60 text-sm italic">
              Bez slovního komentáře.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
