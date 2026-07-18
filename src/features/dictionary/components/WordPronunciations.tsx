import { EmptyState } from "../../../shared/components/EmptyState";
import { WordSoundResponse } from "../types";

export const WordPronunciations = ({ sounds }: { sounds?: WordSoundResponse[] | null }) => {
  if (!sounds?.length) {
    return <EmptyState description="No pronunciations are available for this word yet." />;
  }

  return (
    <div className="panel">
      <h2>Pronunciation</h2>
      {sounds.map((sound, index) => (
        <p key={`${sound.mp3Url ?? sound.oggUrl ?? sound.ipa}-${index}`}>
          {sound.ipa ?? sound.enpr ?? "Audio"} {sound.mp3Url ? <audio controls src={sound.mp3Url} /> : null}
        </p>
      ))}
    </div>
  );
};
