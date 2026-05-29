"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMyTeacherRating, saveTeacherRating } from "@/app/actions/contributions";

interface TeacherRatingFormProps {
  teacherId: string;
  isLoggedIn: boolean;
}

export function TeacherRatingForm({ teacherId, isLoggedIn }: TeacherRatingFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    async function fetchExisting() {
      const result = await getMyTeacherRating(teacherId)
      if (!result.success || !result.data) {
        return;
      }
      const existingRating = result.data;

      if (existingRating) {
        setRating(existingRating.rating || 0);
        setReview(existingRating.review || '');
      }
    }

    fetchExisting();
  }, [teacherId, isLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError("Vyberte hodnocení 1-5 hvězdiček.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    const result = await saveTeacherRating({
      teacherId,
      rating,
      review,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    router.refresh();
  };

  if (!isLoggedIn) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground mb-4">
          Pro přidání hodnocení se musíte přihlásit.
        </p>
        <Link 
          href="/prihlaseni"
          className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
        >
          Přihlásit se
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center">
        Děkujeme! Vaše hodnocení bylo uloženo.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Celkové hodnocení
        </label>
        <div 
          className="flex gap-1"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="text-2xl transition-transform hover:scale-110 focus:outline-none"
              onMouseEnter={() => setHoverRating(star)}
              onClick={() => setRating(star)}
            >
              <span className={(hoverRating || rating) >= star ? "text-yellow-400" : "text-muted opacity-40 grayscale"}>
                ⭐
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Slovní hodnocení (volitelné)
        </label>
        <textarea
          rows={3}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Jaké má učitel nároky? Jaký je jeho styl výuky? Zde se můžete rozepsat..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-y"
        />
      </div>

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting || !rating}
        className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Ukládám..." : "Odeslat hodnocení"}
      </button>
    </form>
  );
}
