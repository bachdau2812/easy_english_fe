import { EmptyState } from "../../../shared/components/EmptyState";
import { WordIdiomResponse } from "../types";

export const WordIdiomList = ({ idioms }: { idioms?: WordIdiomResponse[] | null }) => {
  if (!idioms?.length) {
    return <EmptyState description="No idioms are available for this word yet." />;
  }

  return (
    <div className="panel">
      <h2>Idioms</h2>
      {idioms.map((idiom, index) => (
        <article key={`${idiom.idiom ?? "idiom"}-${index}`}>
          <h3>{idiom.idiom}</h3>
          <p>{idiom.definition ?? idiom.trans?.definition}</p>
        </article>
      ))}
    </div>
  );
};
