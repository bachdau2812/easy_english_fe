import { EmptyState } from "../../../shared/components/EmptyState";
import { formatDate } from "../../../shared/utils/date";
import { UserVocabularyResponse } from "../types";

export const SavedVocabularyList = ({ items }: { items?: UserVocabularyResponse[] }) => {
  if (!items?.length) {
    return <EmptyState description="Saved vocabulary will appear here by review level." />;
  }

  return (
    <div className="panel">
      {items.map((item) => (
        <article key={item.id ?? `${item.wordId}-${item.senseId}`}>
          <strong>Word ID: {item.wordId}</strong>
          <p>
            Level {item.level ?? 1} • Next review {formatDate(item.nextReviewAt)}
          </p>
        </article>
      ))}
    </div>
  );
};
