import { type CSSProperties, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  WordIdiomResponse,
  WordRelationResponse,
  WordResponse,
  WordSenseResponse,
  WordSoundResponse
} from "../../dictionary/types";
import { useAuth } from "../../auth/hooks/useAuth";
import { vocabularyApi } from "../../vocabulary/api/vocabularyApi";
import { HomeIcon } from "./HomeIcon";

const MOCHI_AUDIO_PREFIX = "https://mochien-server.mochidemy.com/audios/question/";

const compact = (values: Array<string | null | undefined>): string[] =>
  values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));

const buildSoundUrl = (sound: WordSoundResponse): string | null => {
  const rawUrl = sound.mp3Url || sound.oggUrl;

  if (!rawUrl) {
    return null;
  }

  return rawUrl.startsWith("https://") || rawUrl.startsWith("http://")
    ? rawUrl
    : `${MOCHI_AUDIO_PREFIX}${rawUrl}`;
};

const playSound = (sound: WordSoundResponse) => {
  const soundUrl = buildSoundUrl(sound);

  if (!soundUrl) {
    return;
  }

  void new Audio(soundUrl).play();
};

const relationEntries = (relation?: WordRelationResponse | null) =>
  [
    { key: "synonyms", label: "Synonyms", values: relation?.synonyms },
    { key: "antonyms", label: "Antonyms", values: relation?.antonyms },
    { key: "derived", label: "Derived", values: relation?.derived },
    { key: "coordinateTerms", label: "Coordinate terms", values: relation?.coordinateTerms },
    { key: "formOf", label: "Form of", values: relation?.formOf },
    { key: "altOf", label: "Alt of", values: relation?.altOf }
  ].filter((entry) => (entry.values ?? []).length > 0);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface HomeWordResultProps {
  onRequireAuth: () => void;
  word: WordResponse;
}

type IdiomPopupStyle = CSSProperties & {
  "--idiom-arrow-top"?: string;
};

export const HomeWordResult = ({ onRequireAuth, word }: HomeWordResultProps) => {
  const auth = useAuth();
  const idiomCloseTimerRef = useRef<number | null>(null);
  const saveDoneTimerRef = useRef<number | null>(null);
  const saveMessageTimerRef = useRef<number | null>(null);
  const [expandedSenseIds, setExpandedSenseIds] = useState<Record<string, boolean>>({});
  const [expandedIdiomIds, setExpandedIdiomIds] = useState<Record<string, boolean>>({});
  const [doneSenseKey, setDoneSenseKey] = useState<string | null>(null);
  const [activeIdiomPopup, setActiveIdiomPopup] = useState<{
    key: string;
    placement: "left" | "right";
    style: IdiomPopupStyle;
  } | null>(null);
  const [relationTab, setRelationTab] = useState("synonyms");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const saveVocabulary = useMutation({
    mutationFn: ({ sense }: { sense: WordSenseResponse; senseKey: string }) => {
      if (!auth.userId) {
        throw new Error("Please sign in before saving this word.");
      }

      if (!word.wordId) {
        throw new Error("This word is missing an id.");
      }

      const senseLocalizedId = sense.localizationId ?? null;
      const senseId = senseLocalizedId ? null : sense.senseId ?? null;

      if (!senseId && !senseLocalizedId) {
        throw new Error("This meaning cannot be saved yet.");
      }

      return vocabularyApi.saveVocabulary({
        userId: auth.userId,
        wordId: word.wordId,
        senseId,
        senseLocalizedId,
        level: 1
      });
    },
    onSuccess: (_result, variables) => {
      setSaveMessage(null);
      setDoneSenseKey(variables.senseKey);

      if (saveDoneTimerRef.current !== null) {
        window.clearTimeout(saveDoneTimerRef.current);
      }

      saveDoneTimerRef.current = window.setTimeout(() => {
        setDoneSenseKey(null);
        saveDoneTimerRef.current = null;
      }, 2000);
    },
    onError: () => {
      setSaveMessage("Already saved");

      if (saveMessageTimerRef.current !== null) {
        window.clearTimeout(saveMessageTimerRef.current);
      }

      saveMessageTimerRef.current = window.setTimeout(() => {
        setSaveMessage(null);
        saveMessageTimerRef.current = null;
      }, 3000);
    }
  });

  const relations = relationEntries(word.relation);
  const activeRelation =
    relations.find((entry) => entry.key === relationTab) ?? relations[0] ?? null;
  const senses = word.senses ?? [];

  const clearIdiomCloseTimer = () => {
    if (idiomCloseTimerRef.current !== null) {
      window.clearTimeout(idiomCloseTimerRef.current);
      idiomCloseTimerRef.current = null;
    }
  };

  const openIdiomPopup = (key: string, element: HTMLElement) => {
    clearIdiomCloseTimer();

    if (window.innerWidth <= 960) {
      setActiveIdiomPopup({ key, placement: "right", style: {} });
      return;
    }

    const rect = element.getBoundingClientRect();
    const margin = 24;
    const gap = 12;
    const popupWidth = Math.min(520, window.innerWidth - margin * 2);
    const popupHeight = Math.min(480, window.innerHeight * 0.72);
    const leftSide = rect.left - popupWidth - gap;
    const rightSide = rect.right + gap;
    const opensLeft = leftSide >= margin;
    const left = opensLeft ? leftSide : clamp(rightSide, margin, window.innerWidth - popupWidth - margin);
    const top = clamp(
      rect.top + rect.height / 2 - popupHeight / 2,
      margin,
      window.innerHeight - popupHeight - margin
    );
    const arrowTop = clamp(rect.top + rect.height / 2 - top, 24, popupHeight - 24);

    setActiveIdiomPopup({
      key,
      placement: opensLeft ? "left" : "right",
      style: {
        "--idiom-arrow-top": `${arrowTop}px`,
        left,
        maxHeight: popupHeight,
        right: "auto",
        top,
        transform: "none",
        width: popupWidth
      }
    });
  };

  const scheduleIdiomPopupClose = () => {
    clearIdiomCloseTimer();
    idiomCloseTimerRef.current = window.setTimeout(() => {
      setActiveIdiomPopup(null);
      idiomCloseTimerRef.current = null;
    }, 180);
  };

  return (
    <section className="home-word-result">
      <article className="home-word-result__main">
        <header className="home-word-result__word">
          <div>
            <h1>{word.word ?? word.normalizedWord ?? "Untitled word"}</h1>
            <p>{word.normalizedWord && word.normalizedWord !== word.word ? word.normalizedWord : "Word detail"}</p>
          </div>
          {word.pos ? <span>{word.pos}</span> : null}
        </header>

        {(word.sounds ?? []).length > 0 ? (
          <div className="home-word-sounds" aria-label="Pronunciations">
            {(word.sounds ?? []).map((sound, index) => {
              const tags = compact(sound.tags ?? []);
              const hasAudio = Boolean(buildSoundUrl(sound));
              const hasPronunciationText = Boolean(sound.ipa || sound.enpr);
              const hasSoundMeta = Boolean(sound.ipa || sound.enpr || tags.length > 0);
              const isAudioOnly = hasAudio && !hasPronunciationText;

              return (
                <div
                  className={`home-word-sound ${isAudioOnly ? "home-word-sound--audio-only" : ""}`}
                  key={`${sound.mp3Url ?? sound.oggUrl ?? index}`}
                >
                  {hasSoundMeta ? (
                    <div>
                      {sound.ipa ? (
                        <span className="home-word-sound__chip home-word-sound__chip--ipa">
                          <b>IPA</b>
                          {sound.ipa}
                        </span>
                      ) : null}
                      {sound.enpr ? (
                        <span className="home-word-sound__chip home-word-sound__chip--enpr">
                          <b>ENPR</b>
                          {sound.enpr}
                        </span>
                      ) : null}
                      {tags.map((tag) => (
                        <span className="home-word-sound__chip home-word-sound__chip--tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {hasAudio ? (
                    <button aria-label="Play pronunciation" onClick={() => playSound(sound)} type="button">
                      <HomeIcon name="volume" size={18} />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {(word.categories ?? []).length > 0 ? (
          <div className="home-word-categories">
            {(word.categories ?? []).map((category) => (
              <span key={category}>{category}</span>
            ))}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="home-word-save-message home-word-save-message--toast" role="status">
            {saveMessage}
          </div>
        ) : null}

        {senses.length > 0 ? (
          <div className="home-word-senses">
            {senses.map((sense, index) => {
              const senseKey = sense.senseId ?? sense.localizationId ?? String(index);
              const examples = sense.examples ?? [];
              const isExpanded = Boolean(expandedSenseIds[senseKey]);
              const visibleExamples = isExpanded ? examples : examples.slice(0, 1);
              const meaning =
                sense.trans?.definition ||
                sense.trans?.shortMeaning ||
                sense.definition ||
                sense.shortMeaning ||
                "No definition yet.";
              const senseRelations = relationEntries(sense as WordRelationResponse);
              const isSaveDone = doneSenseKey === senseKey;

              return (
                <article className="home-word-sense" key={senseKey}>
                  <div className="home-word-sense__heading">
                    <span>{index + 1}</span>
                    <div>
                      <h2>{meaning}</h2>
                      {sense.certLevel || word.certLevel ? <small>{sense.certLevel ?? word.certLevel}</small> : null}
                    </div>
                    <button
                      className={isSaveDone ? "home-word-save-button--done" : ""}
                      onClick={() => (auth.isAuthenticated ? saveVocabulary.mutate({ sense, senseKey }) : onRequireAuth())}
                      type="button"
                    >
                      <HomeIcon name={isSaveDone ? "check" : "bookmark"} size={17} />
                      {isSaveDone ? "Done" : "Save"}
                    </button>
                  </div>

                  {visibleExamples.length > 0 ? (
                    <div className="home-word-examples">
                      {visibleExamples.map((example, exampleIndex) => (
                        <blockquote key={example.wordExampleId ?? exampleIndex}>
                          <p>{example.sentence}</p>
                          {example.trans ? <small>{example.trans}</small> : null}
                        </blockquote>
                      ))}
                      {examples.length > 1 ? (
                        <button
                          onClick={() =>
                            setExpandedSenseIds((current) => ({
                              ...current,
                              [senseKey]: !isExpanded
                            }))
                          }
                          type="button"
                        >
                          {isExpanded ? "Show less" : `Show ${examples.length - 1} more`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {senseRelations.length > 0 ? (
                    <div className="home-word-inline-relations">
                      {senseRelations.map((entry) => (
                        <p key={entry.key}>
                          <strong>{entry.label}</strong>
                          {(entry.values ?? []).join(", ")}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </article>

      <section className="home-word-result__insights" aria-label="Word extras">
        {(word.forms ?? []).length > 0 ? (
          <section>
            <h3>Definitions</h3>
            <div className="home-word-form-list">
              {(word.forms ?? []).slice(0, 8).map((form, index) => (
                <p key={`${form.form ?? "form"}-${index}`}>
                  <strong>{form.form ?? form.word}</strong>
                  {form.pos ? <span>{form.pos}</span> : null}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {relations.length > 0 ? (
          <section>
            <h3>Word relation</h3>
            <div className="home-word-relation-tabs">
              {relations.map((entry) => (
                <button
                  className={entry.key === activeRelation?.key ? "home-word-relation-tabs__active" : ""}
                  key={entry.key}
                  onClick={() => setRelationTab(entry.key)}
                  type="button"
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="home-word-relation-cloud">
              {(activeRelation?.values ?? []).map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
          </section>
        ) : null}

        {(word.idioms ?? []).length > 0 ? (
          <section>
            <h3>Idioms</h3>
            <div className="home-word-idioms">
              {(word.idioms ?? []).map((idiom: WordIdiomResponse, index) => {
                const idiomKey = `${idiom.idiom ?? "idiom"}-${index}`;
                const expanded = Boolean(expandedIdiomIds[idiomKey]);

                return (
                  <article
                    className="home-word-idiom"
                    key={idiomKey}
                    onMouseEnter={(event) => openIdiomPopup(idiomKey, event.currentTarget)}
                    onMouseLeave={scheduleIdiomPopupClose}
                  >
                    <strong>{idiom.idiom}</strong>
                    <div
                      className={`home-word-idiom__popup ${
                        activeIdiomPopup?.key === idiomKey ? "home-word-idiom__popup--active" : ""
                      } ${
                        activeIdiomPopup?.key === idiomKey
                          ? `home-word-idiom__popup--${activeIdiomPopup.placement}`
                          : ""
                      }`}
                      onMouseEnter={clearIdiomCloseTimer}
                      onMouseLeave={scheduleIdiomPopupClose}
                      style={activeIdiomPopup?.key === idiomKey ? activeIdiomPopup.style : undefined}
                    >
                      {idiom.idiom ? (
                        <p>
                          <b>Idiom</b>
                          <span>{idiom.idiom}</span>
                          {idiom.trans?.idiom ? <small>{idiom.trans.idiom}</small> : null}
                        </p>
                      ) : null}
                      {idiom.definition ? (
                        <p>
                          <b>Definition</b>
                          <span>{idiom.definition}</span>
                          {idiom.trans?.definition ? <small>{idiom.trans.definition}</small> : null}
                        </p>
                      ) : null}
                      {idiom.example ? (
                        <blockquote>
                          <b>Example</b>
                          <span>{idiom.example}</span>
                          {idiom.trans?.example ? <small>{idiom.trans.example}</small> : null}
                        </blockquote>
                      ) : null}
                      {expanded && idiom.example2 ? (
                        <blockquote>
                          <b>Example 2</b>
                          <span>{idiom.example2}</span>
                          {idiom.trans?.example2 ? <small>{idiom.trans.example2}</small> : null}
                        </blockquote>
                      ) : null}
                      {idiom.example2 ? (
                        <button
                          onClick={() =>
                            setExpandedIdiomIds((current) => ({
                              ...current,
                              [idiomKey]: !expanded
                            }))
                          }
                          type="button"
                        >
                          {expanded ? "Less" : "More"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    </section>
  );
};
