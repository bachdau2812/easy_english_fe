import { safeJsonParse } from "../../../shared/utils/json";
import { AudioPlayer } from "./AudioPlayer";
import { PublicListenAndTypeChallenge } from "../types";

export const ListenAndTypeChallenge = ({
  challenge
}: {
  challenge: PublicListenAndTypeChallenge;
}) => {
  const hints = safeJsonParse<string[]>(challenge.hints, []);

  return (
    <article className="listen-focus-challenge">
      <div>
        <strong>Part {challenge.position ?? ""}</strong>
        <p>{challenge.content ?? "Listen and type challenge placeholder"}</p>
      </div>
      <AudioPlayer src={challenge.audioSrc} />
      {hints.length ? <small>Hints available: {hints.length}</small> : null}
    </article>
  );
};
