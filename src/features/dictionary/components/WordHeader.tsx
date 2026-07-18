import { WordResponse } from "../types";

export const WordHeader = ({ word }: { word: WordResponse }) => (
  <header className="page__header">
    <h1 className="page__title">{word.word ?? "Unknown word"}</h1>
    <p className="page__description">
      {[word.pos, word.certLevel, word.langCode].filter(Boolean).join(" • ") || "Word detail"}
    </p>
  </header>
);
