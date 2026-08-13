import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { ROUTES } from "../../../shared/constants/routes";
import { safeJsonParse } from "../../../shared/utils/json";
import { useAuth } from "../../auth/hooks/useAuth";
import { HomeIcon } from "../../home/components/HomeIcon";
import { reviewApi } from "../../review/api/reviewApi";
import { useListeningExerciseDetail } from "../hooks/useListeningExerciseDetail";
import {
  getDictationMask,
  getInitialChallengeIndex,
  normalizeDictationAnswer
} from "../listenAndType";
import { ListenAndTypeChallengeResponse, ListenAndTypeReturnState } from "../types";

type ListenTab = "dictation" | "transcript";

interface DictationHintToken {
  isCorrect: boolean;
  text: string;
}

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

const splitDictationWords = (value?: string | null) => value?.trim().split(/\s+/).filter(Boolean) ?? [];

const parseSolutionAlternatives = (challenge?: ListenAndTypeChallengeResponse | null) => {
  const rawSolution = challenge?.solution?.trim();
  const parsedSolution = safeJsonParse<unknown>(rawSolution, null);

  if (Array.isArray(parsedSolution)) {
    const alternatives = parsedSolution
      .map((entry) => {
        if (Array.isArray(entry)) {
          return entry.map((value) => String(value ?? "").trim()).filter(Boolean);
        }

        const value = String(entry ?? "").trim();
        return value ? [value] : [];
      })
      .filter((entry) => entry.length > 0);

    if (alternatives.length > 0) {
      return alternatives;
    }
  }

  if (typeof parsedSolution === "string" && parsedSolution.trim()) {
    return splitDictationWords(parsedSolution).map((word) => [word]);
  }

  const fallbackWords = splitDictationWords(rawSolution || challenge?.content);
  return fallbackWords.map((word) => [word]);
};

const getCanonicalSolutionWords = (challenge?: ListenAndTypeChallengeResponse | null) =>
  parseSolutionAlternatives(challenge).map((entry) => entry[0]);

const getChallengeSolution = (challenge?: ListenAndTypeChallengeResponse | null) =>
  getCanonicalSolutionWords(challenge).join(" ").trim();

const getContractionExpandedPhrases = (value: string) => {
  const normalizedValue = value.replace(/[’‘]/g, "'").trim();
  const lowerValue = normalizedValue.toLowerCase();
  const specialContractions: Record<string, string[]> = {
    "aren't": ["are not"],
    "can't": ["can not", "cannot"],
    "couldn't": ["could not"],
    "didn't": ["did not"],
    "doesn't": ["does not"],
    "don't": ["do not"],
    "hadn't": ["had not"],
    "hasn't": ["has not"],
    "haven't": ["have not"],
    "isn't": ["is not"],
    "mightn't": ["might not"],
    "mustn't": ["must not"],
    "needn't": ["need not"],
    "shan't": ["shall not"],
    "shouldn't": ["should not"],
    "wasn't": ["was not"],
    "weren't": ["were not"],
    "won't": ["will not"],
    "wouldn't": ["would not"]
  };

  if (specialContractions[lowerValue]) {
    return specialContractions[lowerValue];
  }

  const contractionMatch = normalizedValue.match(/^(.+)'(re|m|ll|ve|s|d)$/i);

  if (!contractionMatch) {
    return [];
  }

  const base = contractionMatch[1];
  const suffix = contractionMatch[2].toLowerCase();
  const expansionsBySuffix: Record<string, string[]> = {
    d: ["would", "had"],
    ll: ["will"],
    m: ["am"],
    re: ["are"],
    s: ["is", "has"],
    ve: ["have"]
  };

  return (expansionsBySuffix[suffix] ?? []).map((expansion) => `${base} ${expansion}`);
};

const getAlternativeMatchCandidates = (alternative: string) => {
  const candidates = [alternative, ...getContractionExpandedPhrases(alternative)];
  const uniqueCandidates = new Map<string, string>();

  candidates.forEach((candidate) => {
    const normalizedCandidate = normalizeDictationAnswer(candidate);
    if (normalizedCandidate && !uniqueCandidates.has(normalizedCandidate)) {
      uniqueCandidates.set(normalizedCandidate, candidate);
    }
  });

  return [...uniqueCandidates.values()];
};

const getMatchedAlternativeWordCount = (
  answerWords: string[],
  startIndex: number,
  alternatives: string[]
) => {
  for (const alternative of alternatives) {
    for (const candidate of getAlternativeMatchCandidates(alternative)) {
      const candidateWords = splitDictationWords(candidate);
      const wordCount = Math.max(candidateWords.length, 1);
      const answerSegment = answerWords.slice(startIndex, startIndex + wordCount).join(" ");
      const normalizedAnswerSegment = normalizeDictationAnswer(answerSegment);
      const normalizedCandidate = normalizeDictationAnswer(candidate);

      if (normalizedAnswerSegment && normalizedAnswerSegment === normalizedCandidate) {
        return wordCount;
      }
    }
  }

  return null;
};

const getDictationMatchResult = (answer: string, solutionAlternatives: string[][]) => {
  const answerWords = splitDictationWords(answer);
  const canonicalWords = solutionAlternatives.map((entry) => entry[0]);
  let answerWordIndex = 0;
  let correctPrefix = 0;

  for (const alternatives of solutionAlternatives) {
    const matchedWordCount = getMatchedAlternativeWordCount(answerWords, answerWordIndex, alternatives);

    if (!matchedWordCount) {
      break;
    }

    answerWordIndex += matchedWordCount;
    correctPrefix += 1;
  }

  const canonicalizedAnswer = [
    ...canonicalWords.slice(0, correctPrefix),
    ...answerWords.slice(answerWordIndex)
  ].join(" ").trim();

  return {
    canonicalAnswer: canonicalWords.join(" ").trim(),
    canonicalizedAnswer,
    correctPrefix,
    isCorrect: correctPrefix === solutionAlternatives.length && answerWordIndex === answerWords.length
  };
};

const getHintTokens = (answer: string, solutionAlternatives: string[][]): DictationHintToken[] => {
  const solutionWords = solutionAlternatives.map((entry) => entry[0]);
  const { correctPrefix } = getDictationMatchResult(answer, solutionAlternatives);

  const visibleCount = correctPrefix < 2 ? 2 : Math.min(correctPrefix + 1, solutionWords.length);
  return solutionWords
    .map((word, index) => ({
      isCorrect: index < correctPrefix,
      text: index < visibleCount ? word : getDictationMask(word)
    }));
};

const getSpeechRecognitionConstructor = () => {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
};

export const ListeningDetailPage = () => {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lessonId } = useParams();
  const dictationAudioRef = useRef<HTMLAudioElement>(null);
  const dictationInputRef = useRef<HTMLTextAreaElement>(null);
  const initializedLessonIdRef = useRef<string | null>(null);
  const mainAudioRef = useRef<HTMLAudioElement>(null);
  const correctPopupOpenedAtRef = useRef(0);
  const previousDictationChallengeIdRef = useRef<string | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechFillEffectTimeoutRef = useRef<number | null>(null);
  const transcriptRowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activeTab, setActiveTab] = useState<ListenTab>("dictation");
  const [answer, setAnswer] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [incorrectHint, setIncorrectHint] = useState<DictationHintToken[] | null>(null);
  const [correctPopupAnswer, setCorrectPopupAnswer] = useState("");
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isJumpPickerOpen, setIsJumpPickerOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechFilling, setIsSpeechFilling] = useState(false);
  const [isCorrectPopupOpen, setIsCorrectPopupOpen] = useState(false);
  const [jumpDraftIndex, setJumpDraftIndex] = useState(0);
  const [retryIds, setRetryIds] = useState<Set<string>>(() => new Set());
  const [transcriptIndex, setTranscriptIndex] = useState(0);
  const returnState = location.state as ListenAndTypeReturnState | null;
  const lesson = useListeningExerciseDetail(lessonId);
  const submitAttempt = useMutation({
    mutationFn: ({ challenge, userAnswer }: { challenge: ListenAndTypeChallengeResponse; userAnswer: string }) => {
      if (!auth.userId || !challenge.id) {
        throw new Error("Missing user or challenge information.");
      }

      return reviewApi.submitReviewAnswer({
        attemptId: challenge.id,
        userId: auth.userId,
        exerciseType: "LAT_LISTEN_AND_TYPE",
        userAnswer,
        correct: true,
        replayCount: 0
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.listeningLessonDetail(lessonId, auth.userId)
      });
      void queryClient.invalidateQueries({
        queryKey: ["listening"]
      });
    }
  });

  const exitLesson = () => {
    setIsExitConfirmOpen(false);
    navigate(ROUTES.listenAndType, { state: returnState ?? undefined });
  };

  const challenges = useMemo(
    () =>
      [...(lesson.data?.challenges ?? [])].sort(
        (left, right) => (left.position ?? 0) - (right.position ?? 0)
      ),
    [lesson.data?.challenges]
  );
  const currentChallenge = challenges[currentIndex] ?? null;
  const currentChallengeId = currentChallenge?.id ?? `challenge-${currentIndex}`;
  const transcriptChallenge = challenges[transcriptIndex] ?? null;
  const transcriptChallengeId = transcriptChallenge?.id ?? `transcript-${transcriptIndex}`;
  const currentSolutionAlternatives = parseSolutionAlternatives(currentChallenge);
  const currentSolution = getChallengeSolution(currentChallenge);
  const currentHints = safeJsonParse<string[]>(currentChallenge?.hints, []);
  const isCurrentDone =
    Boolean(currentChallenge?.isDone || (currentChallenge?.id && doneIds.has(currentChallenge.id))) &&
    !Boolean(currentChallenge?.id && retryIds.has(currentChallenge.id));
  const progressPercent = challenges.length ? ((currentIndex + 1) / challenges.length) * 100 : 0;
  const isLastChallenge = currentIndex >= challenges.length - 1;

  useEffect(() => {
    const loadedLessonId = lesson.data?.lessonId ?? lessonId ?? null;

    if (
      !loadedLessonId ||
      initializedLessonIdRef.current === loadedLessonId ||
      challenges.length === 0
    ) {
      return;
    }

    initializedLessonIdRef.current = loadedLessonId;
    setDoneIds(new Set(lesson.data?.completedChallengeIds ?? []));
    setRetryIds(new Set());
    setCurrentIndex(
      getInitialChallengeIndex(challenges, lesson.data?.completedChallengeIds ?? [])
    );
  }, [challenges, lesson.data?.completedChallengeIds, lesson.data?.lessonId, lessonId]);

  useEffect(() => {
    if (!currentChallenge) {
      return;
    }

    setAnswer(isCurrentDone ? currentSolution : "");
    if (!isCorrectPopupOpen) {
      setCorrectPopupAnswer("");
    }
    setIncorrectHint(null);
  }, [currentChallengeId, currentSolution, isCurrentDone, isCorrectPopupOpen]);

  useEffect(() => {
    if (activeTab !== "dictation" || !currentChallenge || isCurrentDone) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      dictationInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [activeTab, currentChallengeId, isCurrentDone]);

  useEffect(
    () => () => {
      speechRecognitionRef.current?.stop();
      if (speechFillEffectTimeoutRef.current) {
        window.clearTimeout(speechFillEffectTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!autoScroll || activeTab !== "transcript") {
      return;
    }

    transcriptRowRefs.current[transcriptChallengeId]?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }, [activeTab, autoScroll, transcriptChallengeId]);

  useEffect(() => {
    if (activeTab !== "dictation") {
      return;
    }

    const replayOnControl = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Control" || event.repeat) {
        return;
      }

      const audio = dictationAudioRef.current;
      if (!audio) {
        return;
      }

      audio.currentTime = 0;
      void audio.play();
    };

    window.addEventListener("keydown", replayOnControl);
    return () => window.removeEventListener("keydown", replayOnControl);
  }, [activeTab, currentChallengeId]);

  useEffect(() => {
    if (activeTab !== "dictation" || !currentChallenge) {
      return;
    }

    const previousChallengeId = previousDictationChallengeIdRef.current;
    previousDictationChallengeIdRef.current = currentChallengeId;

    if (!previousChallengeId || previousChallengeId === currentChallengeId) {
      return;
    }

    const playTimer = window.setTimeout(() => {
      const audio = dictationAudioRef.current;

      if (!audio) {
        return;
      }

      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }, 80);

    return () => window.clearTimeout(playTimer);
  }, [activeTab, currentChallenge, currentChallengeId]);

  useEffect(() => {
    if (!isCorrectPopupOpen) {
      return;
    }

    const closeOnEnter = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Enter") {
        const elapsedSinceOpen = performance.now() - correctPopupOpenedAtRef.current;
        if (event.repeat || elapsedSinceOpen < 300) {
          return;
        }

        event.preventDefault();
        closeCorrectPopup();
      }
    };

    window.addEventListener("keydown", closeOnEnter);
    return () => window.removeEventListener("keydown", closeOnEnter);
  }, [isCorrectPopupOpen, isLastChallenge]);

  const moveToChallenge = (nextIndex: number) => {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), Math.max(challenges.length - 1, 0));
    setCurrentIndex(boundedIndex);
    setCorrectPopupAnswer("");
    setIsJumpPickerOpen(false);
    setIncorrectHint(null);
  };

  const previewJumpToChallenge = (nextIndex: number) => {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), Math.max(challenges.length - 1, 0));
    setJumpDraftIndex(boundedIndex);
  };

  const toggleJumpPicker = () => {
    setJumpDraftIndex(currentIndex);
    setIsJumpPickerOpen((current) => !current);
  };

  const commitJumpPicker = () => {
    moveToChallenge(jumpDraftIndex);
  };

  const moveToTranscript = (nextIndex: number) => {
    const boundedIndex = Math.min(Math.max(nextIndex, 0), Math.max(challenges.length - 1, 0));
    setTranscriptIndex(boundedIndex);

    const nextStartTime = challenges[boundedIndex]?.timeStart;
    if (mainAudioRef.current && typeof nextStartTime === "number") {
      mainAudioRef.current.currentTime = nextStartTime;
    }
  };

  const handleCheck = () => {
    if (!currentChallenge || isCurrentDone || isCorrectPopupOpen) {
      return;
    }

    const matchResult = getDictationMatchResult(answer, currentSolutionAlternatives);
    const nextAnswer = matchResult.canonicalizedAnswer || answer;

    if (nextAnswer !== answer) {
      setAnswer(nextAnswer);
    }

    if (!matchResult.isCorrect) {
      setIncorrectHint(getHintTokens(nextAnswer, currentSolutionAlternatives));
      return;
    }

    setAnswer(matchResult.canonicalAnswer || currentSolution);
    setCorrectPopupAnswer(matchResult.canonicalAnswer || currentSolution || nextAnswer);
    correctPopupOpenedAtRef.current = performance.now();
    setIsCorrectPopupOpen(true);

    if (currentChallenge.id) {
      setDoneIds((current) => new Set(current).add(currentChallenge.id as string));
      setRetryIds((current) => {
        const next = new Set(current);
        next.delete(currentChallenge.id as string);
        return next;
      });
      submitAttempt.mutate({ challenge: currentChallenge, userAnswer: matchResult.canonicalAnswer || nextAnswer });
    }
  };

  const closeCorrectPopup = () => {
    setIsCorrectPopupOpen(false);

    if (!isLastChallenge) {
      moveToChallenge(currentIndex + 1);
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleCheck();
    }
  };

  const startSpeechInput = () => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setIncorrectHint([{ isCorrect: false, text: "Speech input is not available in this browser." }]);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = lesson.data?.speechToTextLangCode ?? "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .filter(Boolean)
        .join(" ")
        .trim();

      if (transcript) {
        setAnswer((current) => `${current}${current.trim() ? " " : ""}${transcript}`.trim());
        setIncorrectHint(null);
        setIsSpeechFilling(true);
        if (speechFillEffectTimeoutRef.current) {
          window.clearTimeout(speechFillEffectTimeoutRef.current);
        }
        speechFillEffectTimeoutRef.current = window.setTimeout(() => {
          setIsSpeechFilling(false);
          speechFillEffectTimeoutRef.current = null;
        }, 950);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    speechRecognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const playTranscriptRow = (challenge: ListenAndTypeChallengeResponse, index: number) => {
    moveToTranscript(index);

    const startTime = challenge.timeStart;
    if (mainAudioRef.current && typeof startTime === "number") {
      mainAudioRef.current.currentTime = startTime;
      void mainAudioRef.current.play();
    }
  };

  const handleTranscriptTimeUpdate = () => {
    const currentTime = mainAudioRef.current?.currentTime;
    if (typeof currentTime !== "number") {
      return;
    }

    const nextIndex = challenges.findIndex((challenge) => {
      const start = challenge.timeStart ?? Number.NEGATIVE_INFINITY;
      const end = challenge.timeEnd ?? Number.POSITIVE_INFINITY;
      return currentTime >= start && currentTime <= end;
    });

    if (nextIndex >= 0 && nextIndex !== transcriptIndex) {
      setTranscriptIndex(nextIndex);
    }
  };

  const retryCurrentChallenge = () => {
    if (!currentChallenge?.id) {
      return;
    }

    setRetryIds((current) => new Set(current).add(currentChallenge.id as string));
    setAnswer("");
    setIncorrectHint(null);
  };

  if (lesson.isLoading) {
    return (
      <main className="listen-focus-screen">
        <div className="vocab-review-loading" role="status">
          <span>
            <HomeIcon name="headphones" size={34} />
          </span>
          <div>
            <h3>Loading lesson</h3>
            <p>Preparing audio, prompts, and listen-and-type parts.</p>
          </div>
          <div className="vocab-review-loading__bar">
            <span />
          </div>
        </div>
      </main>
    );
  }

  if (lesson.isError) {
    return (
      <main className="listen-focus-screen">
        <div className="listen-focus-screen__state">
          <ErrorState error={lesson.error} title="Could not load lesson" />
          <button onClick={exitLesson} type="button">
            Back to lessons
          </button>
        </div>
      </main>
    );
  }

  if (!lesson.data) {
    return (
      <main className="listen-focus-screen">
        <div className="listen-focus-screen__state">
          <EmptyState description="No lesson detail was returned." />
          <button onClick={exitLesson} type="button">
            Back to lessons
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="listen-focus-screen">
      <section className="listen-focus-panel">
        <header className="vocab-review-screen__header">
          <div>
            <strong>{lesson.data.title ?? "Listening lesson"}</strong>
          </div>
          <button onClick={() => setIsExitConfirmOpen(true)} type="button">
            <HomeIcon name="close" size={18} />
            Exit
          </button>
        </header>

        {challenges.length ? (
          <>
            <div className="listen-dictation-progress" aria-label="Lesson progress">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <nav className="listen-focus-tabs" aria-label="Listen lesson tabs">
              <button
                className={activeTab === "dictation" ? "listen-focus-tab--active" : ""}
                onClick={() => setActiveTab("dictation")}
                type="button"
              >
                Dictation
              </button>
              <button
                className={activeTab === "transcript" ? "listen-focus-tab--active" : ""}
                onClick={() => setActiveTab("transcript")}
                type="button"
              >
                Full transcript
              </button>
            </nav>

            <div className="listen-tab-content">
              {activeTab === "dictation" && currentChallenge ? (
                <section className="listen-dictation-card">
                  <audio
                    controls
                    ref={dictationAudioRef}
                    src={currentChallenge.audioSrc ?? lesson.data.audioUrl ?? undefined}
                  />
                  {currentHints.length ? (
                    <div className="listen-dictation-hints">
                      {currentHints.map((hint) => (
                        <span key={hint}>{hint}</span>
                      ))}
                    </div>
                  ) : null}

                  {isCurrentDone ? (
                    <div className="listen-dictation-complete">
                      <small>Completed answer</small>
                      <p>{currentSolution}</p>
                      <div className="listen-dictation-actions">
                        <button onClick={retryCurrentChallenge} type="button">
                          Try again
                        </button>
                        {!isLastChallenge ? (
                          <button
                            onClick={() => moveToChallenge(currentIndex + 1)}
                            type="button"
                          >
                            Next
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <>
                      <label
                        className={`listen-dictation-input ${
                          isListening ? "listen-dictation-input--listening" : ""
                        } ${isSpeechFilling ? "listen-dictation-input--filling" : ""}`}
                      >
                        <textarea
                          onChange={(event) => {
                            setAnswer(event.target.value);
                            setIncorrectHint(null);
                          }}
                          onKeyDown={handleTextareaKeyDown}
                          placeholder="Type what you hear..."
                          ref={dictationInputRef}
                          rows={7}
                          value={answer}
                        />
                        <button
                          aria-label={isListening ? "Listening" : "Speak to fill"}
                          className={`listen-speech-button ${isListening ? "listen-speech-button--active" : ""}`}
                          onClick={startSpeechInput}
                          type="button"
                        >
                          <HomeIcon name="mic" size={20} />
                        </button>
                      </label>
                      {incorrectHint ? (
                        <div className="listen-dictation-incorrect">
                          <strong>Incorrect</strong>
                          <p>
                            {incorrectHint.map((token, index) => (
                              <span
                                className={token.isCorrect ? "listen-dictation-hint-token--correct" : ""}
                                key={`${token.text}-${index}`}
                              >
                                {token.text}
                              </span>
                            ))}
                          </p>
                        </div>
                      ) : (
                        <div className="listen-dictation-actions">
                          <div>
                            <div className="listen-jump-picker">
                              <button
                                aria-expanded={isJumpPickerOpen}
                                aria-label="Jump to part"
                                onClick={toggleJumpPicker}
                                type="button"
                              >
                                {currentIndex + 1}
                              </button>
                              {isJumpPickerOpen ? (
                                <div className="listen-jump-picker__menu">
                                  <input
                                    max={challenges.length}
                                    min={1}
                                    onChange={(event) => previewJumpToChallenge(Number(event.target.value) - 1)}
                                    onInput={(event) => previewJumpToChallenge(Number(event.currentTarget.value) - 1)}
                                    onKeyUp={commitJumpPicker}
                                    onPointerUp={commitJumpPicker}
                                    onTouchEnd={commitJumpPicker}
                                    type="range"
                                    value={jumpDraftIndex + 1}
                                  />
                                  <span>
                                    {jumpDraftIndex + 1} / {challenges.length}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            <button onClick={() => moveToChallenge(currentIndex + 1)} type="button">
                              Skip
                            </button>
                          </div>
                          <button disabled={isCorrectPopupOpen} onClick={handleCheck} type="button">
                            Check
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              ) : null}

              {activeTab === "transcript" ? (
                <section className="listen-transcript-view">
                  <div className="listen-transcript-player">
                    <audio
                      controls
                      onTimeUpdate={handleTranscriptTimeUpdate}
                      ref={mainAudioRef}
                      src={lesson.data.audioUrl ?? undefined}
                    />
                    <div className="listen-transcript-current">
                      {transcriptChallenge?.content ?? "Select a sentence"}
                    </div>
                    <div className="listen-transcript-nav">
                      <button onClick={() => moveToTranscript(transcriptIndex - 1)} type="button">
                        Prev
                      </button>
                      <span>
                        {transcriptIndex + 1} / {challenges.length}
                      </span>
                      <button onClick={() => moveToTranscript(transcriptIndex + 1)} type="button">
                        Next
                      </button>
                    </div>
                  </div>
                  <div className="listen-transcript-list-panel">
                    <div className="listen-transcript-list">
                      {challenges.map((challenge, index) => (
                        <button
                          className={index === transcriptIndex ? "listen-transcript-row--active" : ""}
                          key={challenge.id ?? index}
                          onClick={() => playTranscriptRow(challenge, index)}
                          ref={(element) => {
                            transcriptRowRefs.current[challenge.id ?? `challenge-${index}`] = element;
                          }}
                          type="button"
                        >
                          <span>
                            <HomeIcon name="play" size={18} />
                          </span>
                          {challenge.content ?? `Part ${index + 1}`}
                        </button>
                      ))}
                    </div>
                    <label className="listen-transcript-autoscroll">
                      <input
                        checked={autoScroll}
                        onChange={(event) => setAutoScroll(event.target.checked)}
                        type="checkbox"
                      />
                      Auto scroll
                    </label>
                  </div>
                </section>
              ) : null}
            </div>
          </>
        ) : (
          <EmptyState description="No challenges were returned for this lesson." />
        )}
      </section>

      {isExitConfirmOpen ? (
        <div className="vocab-saved-popup-backdrop">
          <section aria-modal="true" className="vocab-review-exit-popup" role="dialog">
            <span>
              <HomeIcon name="close" size={26} />
            </span>
            <h3>Exit lesson?</h3>
            <p>Your current listen-and-type progress on this screen will be left.</p>
            <div>
              <button onClick={() => setIsExitConfirmOpen(false)} type="button">
                Stay
              </button>
              <button onClick={exitLesson} type="button">
                Exit lesson
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isCorrectPopupOpen ? (
        <div className="vocab-saved-popup-backdrop">
          <section aria-modal="true" className="listen-correct-popup" role="dialog">
            <span>
              <HomeIcon name="check" size={28} />
            </span>
            <h3>Correct</h3>
            <p>{correctPopupAnswer || currentSolution}</p>
            <button onClick={closeCorrectPopup} type="button">
              Continue
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
};
