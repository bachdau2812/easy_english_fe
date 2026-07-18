import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { SavedVocabularyList } from "../components/SavedVocabularyList";
import { useSavedVocabularies } from "../hooks/useSavedVocabularies";

export const SavedVocabularyPage = () => {
  const vocabularies = useSavedVocabularies(1);

  if (vocabularies.isLoading) {
    return <PageLoading label="Loading saved vocabulary..." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Saved vocabulary</h1>
        <p className="page__description">
          This base reads level 1 with `/user-vocabularies/by-level`; add controls for levels 1-6 later.
        </p>
      </div>
      {vocabularies.isError ? (
        <ErrorState error={vocabularies.error} title="Could not load vocabulary" />
      ) : (
        <SavedVocabularyList items={vocabularies.data?.content} />
      )}
    </section>
  );
};
