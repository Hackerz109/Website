import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchProductReviews, submitReview, deleteReview, type ProductReview } from "@/lib/reviews";

export function ReviewsSection({ productId }: { productId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftBody, setDraftBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchProductReviews(productId)
      .then((data) => {
        if (!cancelled) {
          setReviews(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const myReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null;
  const otherReviews = reviews.filter((r) => r.id !== myReview?.id);
  // Computed from the fetched list rather than the product row's own
  // rating_avg/rating_count — those were snapshotted when this page's
  // server-rendered load ran, so they'd be a submission behind right after
  // this shopper's own review lands. Same rounding as recalc_product_rating()
  // in the DB (ROUND(..., 1)), so this matches what the trigger will settle on.
  const count = reviews.length;
  const average = count > 0 ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10 : 0;

  function startEditing() {
    setDraftRating(myReview?.rating ?? 0);
    setDraftBody(myReview?.body ?? "");
    setEditing(true);
  }

  async function handleSubmit() {
    if (!user || draftRating < 1) return;
    setSubmitting(true);
    try {
      await submitReview({ productId, userId: user.id, rating: draftRating, body: draftBody });
      const updated = await fetchProductReviews(productId);
      setReviews(updated);
      setEditing(false);
      toast.success(myReview ? "Review updated" : "Review posted — thanks!");
    } catch {
      toast.error("Couldn't save your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!myReview) return;
    setSubmitting(true);
    try {
      await deleteReview(myReview.id);
      setReviews((prev) => prev.filter((r) => r.id !== myReview.id));
      toast.success("Review removed");
    } catch {
      toast.error("Couldn't remove your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Ratings & reviews</h2>
        {count > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <StarRating value={average} size="sm" />
            {average.toFixed(1)} · {count} review{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!loaded ? (
        <div aria-hidden="true" className="mt-4 h-20 animate-pulse rounded-2xl border border-dashed border-border bg-secondary/30" />
      ) : (
        <div className="mt-4 space-y-5">
          {authLoading ? null : !user ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>
              <Button asChild size="sm" className="rounded-xl">
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Link>
              </Button>
            </div>
          ) : editing ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
              <p className="mb-2 text-sm font-semibold">Your rating</p>
              <StarRating value={draftRating} onChange={setDraftRating} size="lg" />
              <Textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder="What did you think? (optional)"
                className="mt-3"
                rows={3}
                maxLength={2000}
              />
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="rounded-xl" disabled={draftRating < 1 || submitting} onClick={handleSubmit}>
                  {submitting ? "Saving…" : "Submit review"}
                </Button>
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setEditing(false)} disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : myReview ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StarRating value={myReview.rating} size="sm" />
                  <span className="text-xs font-semibold text-muted-foreground">Your review</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 rounded-lg px-2" onClick={startEditing} aria-label="Edit your review">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-lg px-2 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                    disabled={submitting}
                    aria-label="Delete your review"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {myReview.body && <p className="mt-2 text-sm text-foreground">{myReview.body}</p>}
            </div>
          ) : (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={startEditing}>
              Write a review
            </Button>
          )}

          {otherReviews.length === 0 && !myReview ? (
            <p className="text-sm text-muted-foreground">No reviews yet — be the first to leave one.</p>
          ) : (
            <div className="space-y-4">
              {otherReviews.map((r) => (
                <div key={r.id} className="border-b border-border pb-4 last:border-0">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} size="sm" />
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.body && <p className="mt-1.5 text-sm text-foreground">{r.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
