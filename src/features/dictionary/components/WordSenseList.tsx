import { EmptyState } from "../../../shared/components/EmptyState";
import { WordExampleList } from "./WordExampleList";
import { WordSenseResponse } from "../types";

export const WordSenseList = ({ senses }: { senses?: WordSenseResponse[] | null }) => {
  if (!senses?.length) {
    return <EmptyState description="No senses are available for this word yet." />;
  }

  return (
    <div className="panel">
      <h2>Senses</h2>
      {senses.map((sense, index) => (
        <article key={sense.senseId ?? sense.localizationId ?? index}>
          <h3>{sense.shortMeaning ?? sense.trans?.shortMeaning ?? "Meaning"}</h3>
          <p>{sense.definition ?? sense.trans?.definition}</p>
          <WordExampleList examples={sense.examples} />
        </article>
      ))}
    </div>
  );
};
