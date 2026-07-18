import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { ReviewQuestionCard } from "../components/ReviewQuestionCard";
import { ReviewSummary } from "../components/ReviewSummary";
import { useReviewSession } from "../hooks/useReviewSession";

export const ReviewPage = () => {
  const review = useReviewSession(30);
  const questions = review.data ?? [];

  if (review.isLoading) {
    return <PageLoading label="Preparing review..." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Review session</h1>
        <p className="page__description">Uses `/exercises/vocab-review` and frontend-computed correctness.</p>
      </div>
      {review.isError ? <ErrorState error={review.error} title="Could not start review" /> : null}
      {!review.isError && questions.length === 0 ? (
        <EmptyState description="No review questions were returned." />
      ) : null}
      {!review.isError && questions.length > 0 ? (
        <>
          <ReviewSummary total={questions.length} />
          <ReviewQuestionCard question={questions[0]} />
        </>
      ) : null}
    </section>
  );
};
