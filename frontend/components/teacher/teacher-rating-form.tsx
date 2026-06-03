"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteOwnTeacherRating, getMyTeacherRating, saveTeacherRating } from "@/app/actions/contributions";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { ReviewVisibilityField } from "@/components/review/review-visibility-field";
import { Clock3 } from "lucide-react";

interface TeacherRatingFormProps {
  teacherId: string;
  isLoggedIn: boolean;
  hasPublicProfileIdentity: boolean;
  initialDisplayName: string;
  initialFaculty: string | null;
}

export function TeacherRatingForm({
  teacherId,
  isLoggedIn,
  hasPublicProfileIdentity: initialHasPublicProfileIdentity,
  initialDisplayName,
  initialFaculty,
}: TeacherRatingFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [hasExistingRating, setHasExistingRating] = useState(false);
  const [hasPublicProfileIdentity, setHasPublicProfileIdentity] = useState(initialHasPublicProfileIdentity);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReviewPending, setIsReviewPending] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;

    async function fetchExisting() {
      const result = await getMyTeacherRating(teacherId)
      if (!result.success) {
        return;
      }
      const existingRating = result.data;

      if (existingRating) {
        setRating(existingRating.rating || 0);
        setReview(existingRating.review || '');
        setIsAnonymous(existingRating.is_anonymous);
        setHasExistingRating(true);
        setIsReviewPending(Boolean(existingRating.review?.trim()) && existingRating.comment_is_approved === false);
        return;
      }

      setRating(0);
      setReview("");
      setIsAnonymous(false);
      setHasExistingRating(false);
      setIsReviewPending(false);
    }

    fetchExisting();
  }, [teacherId, isLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError("Vyberte hodnocení 1-5 hvězdiček.");
      return;
    }
    if (!isAnonymous && !hasPublicProfileIdentity) {
      setShowDisplayNameModal(true);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const result = await saveTeacherRating({
      teacherId,
      rating,
      review,
      isAnonymous,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setHasExistingRating(true);
    setIsReviewPending(result.moderationPending);
    setSuccessMessage(
      result.moderationPending
        ? "Hodnocení bylo uloženo. Slovní recenze teď čeká na schválení moderátorem."
        : "Hodnocení bylo uloženo.",
    );
    router.refresh();
  };

  const handleDelete = async () => {
    if (!window.confirm("Opravdu chcete smazat celé svoje hodnocení tohoto vyučujícího?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);
    const result = await deleteOwnTeacherRating(teacherId);
    setIsDeleting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setRating(0);
    setReview("");
    setIsAnonymous(false);
    setHasExistingRating(false);
    setIsReviewPending(false);
    setSuccessMessage("Hodnocení bylo smazáno.");
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

  return (
    <>
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

        <ReviewVisibilityField isAnonymous={isAnonymous} onChange={setIsAnonymous} />

        {hasExistingRating && isReviewPending ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            <p>Tvoje slovní recenze čeká na schválení moderátorem.</p>
          </div>
        ) : null}

        {successMessage && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{successMessage}</p>
        )}

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSubmitting || isDeleting || !rating}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Ukládám..." : hasExistingRating ? "Uložit změny" : "Odeslat hodnocení"}
          </button>
          {hasExistingRating && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className="w-full rounded-lg border border-destructive/20 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 sm:w-auto"
            >
              {isDeleting ? "Mažu..." : "Smazat recenzi"}
            </button>
          )}
        </div>
      </form>

      <WelcomeDisplayNameModal
        open={showDisplayNameModal}
        onOpenChange={setShowDisplayNameModal}
        initialDisplayName={initialDisplayName}
        initialFaculty={initialFaculty}
        onCompleted={() => {
          setHasPublicProfileIdentity(true);
        }}
      />
    </>
  );
}
