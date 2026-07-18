import { useParams } from "react-router-dom";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { WordHeader } from "../components/WordHeader";
import { WordIdiomList } from "../components/WordIdiomList";
import { WordPronunciations } from "../components/WordPronunciations";
import { WordSenseList } from "../components/WordSenseList";
import { useWordDetail } from "../hooks/useWordDetail";

export const WordDetailPage = () => {
  const { wordId } = useParams();
  const wordQuery = useWordDetail(wordId);

  if (!wordId) {
    return <EmptyState description="The route did not include a word id." />;
  }

  if (wordQuery.isLoading) {
    return <PageLoading label="Loading word..." />;
  }

  if (wordQuery.isError) {
    return <ErrorState error={wordQuery.error} title="Could not load word" />;
  }

  if (!wordQuery.data) {
    return <EmptyState description="No word detail was returned." />;
  }

  return (
    <section className="page">
      <WordHeader word={wordQuery.data} />
      <WordPronunciations sounds={wordQuery.data.sounds} />
      <WordSenseList senses={wordQuery.data.senses} />
      <WordIdiomList idioms={wordQuery.data.idioms} />
    </section>
  );
};
