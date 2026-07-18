import { Button } from "../../../shared/components/Button";
import { useSaveVocabulary } from "../hooks/useSaveVocabulary";

interface SaveVocabularyButtonProps {
  senseId?: string | null;
  senseLocalizedId?: string | null;
  wordId: string;
}

export const SaveVocabularyButton = ({
  senseId,
  senseLocalizedId,
  wordId
}: SaveVocabularyButtonProps) => {
  const saveVocabulary = useSaveVocabulary();
  const canSave = Boolean(wordId && (senseId || senseLocalizedId));

  return (
    <Button
      disabled={!canSave}
      isLoading={saveVocabulary.isPending}
      onClick={() =>
        saveVocabulary.mutate({
          wordId,
          senseId: senseLocalizedId ? null : senseId,
          senseLocalizedId: senseLocalizedId ?? null,
          level: 1
        })
      }
      variant="secondary"
    >
      Save
    </Button>
  );
};
