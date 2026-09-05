import { ReactNode, useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { AuthRequiredNotice } from "../../../shared/components/AuthRequiredNotice";
import { queryKeys } from "../../../shared/constants/queryKeys";
import { ROUTES } from "../../../shared/constants/routes";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { AccountModal } from "../../home/components/AccountModal";
import { AuthModal } from "../../home/components/AuthModal";
import { HomeIcon } from "../../home/components/HomeIcon";
import { HomeNavbar } from "../../home/components/HomeNavbar";
import { HomeWordDetailModal } from "../../home/components/HomeWordDetailModal";
import { useAuth } from "../../auth/hooks/useAuth";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import { Category, Word, WordResponse } from "../../dictionary/types";
import { searchApi } from "../../search/api/searchApi";
import { selectFullSearchResults } from "../../search/api/searchParams";
import { useRecordSearchHistory } from "../../search/hooks/useRecordSearchHistory";
import { statisticsApi } from "../../statistics/api/statisticsApi";
import { UserVocabularyStatisticResponse, WrongVocabResponse } from "../../statistics/types";
import { reviewApi } from "../../review/api/reviewApi";
import {
  getPlainReviewSentence,
  getReviewMeaningPresentation,
  getReviewResultExamplePresentation,
  getReviewResultSoundUrl,
  parseReviewSentenceMarkup,
  shouldIgnoreReviewResultEnter,
  splitReviewInlineFocus
} from "../../review/reviewPresentation";
import { appendGeneratedReviewQuestionForSession } from "../../review/reviewQueue";
import {
  getReviewPreloadUrls,
  ReviewAudioPool
} from "../../review/reviewAudio";
import { UserVocabAttemptResponse, VocabReviewQuizResponse } from "../../review/types";
import { FloatingVocabularyLookup } from "../../search/components/FloatingVocabularyLookup";
import { vocabularyApi } from "../api/vocabularyApi";
import { SavedVocabularySearch } from "../components/SavedVocabularySearch";
import {
  canReuseSavedVocabularyPage,
  normalizeVocabularyLevelQuantities
} from "../vocabularyInfo";

type VocabularyExploreMode = "levels" | "mine" | "topics";

interface VocabularyExplorePageProps {
  mode: VocabularyExploreMode;
}

const certLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
type MyVocabularySection = "daily" | "list" | "overall" | "review";
type ReviewVocabTotal = 30 | 60 | 90;

const SAVED_VOCABULARY_PAGE_SIZE = 20;
const reviewVocabTotalOptions: ReviewVocabTotal[] = [30, 60, 90];
const reviewReminderTotalOptions = Array.from({ length: 61 }, (_, index) => index + 30);

interface ReviewResultPopupState {
  attempt: UserVocabAttemptResponse;
  question: VocabReviewQuizResponse;
}

interface ReviewSummaryItem {
  key: string;
  meaning: string;
  pos: string;
  word: string;
}

const formatStatNumber = (value?: number | null) => (value ?? 0).toLocaleString("en-US");

const statisticMetricSections = (
  statistic: UserVocabularyStatisticResponse,
  scope: Extract<MyVocabularySection, "daily" | "overall">
) => [
  {
    className: "vocab-stat-section--total",
    metrics: [{ label: "Total attempts", value: statistic.totalAttempts }],
    title: "Overall"
  },
  {
    className: "vocab-stat-section--quiz",
    metrics: [
      { label: "Correct quiz", value: statistic.correctQuizAttempt },
      { label: "Wrong quiz", value: statistic.wrongQuizAttempt }
    ],
    title: "Quiz attempts"
  },
  {
    className: "vocab-stat-section--vocab",
    metrics:
      scope === "daily"
        ? [
            { label: "Unique vocab", value: statistic.totalUniqueVocab },
            { label: "Correct unique vocab", value: statistic.correctUniqueVocab },
            { label: "Wrong unique vocab", value: statistic.wrongUniqueVocab }
          ]
        : [
            { label: "Unique vocab", value: statistic.totalUniqueVocab },
            { label: "Total wrong vocab attempts", value: statistic.wrongCountVocab }
          ],
    title: "Vocabulary review"
  }
];

const StatisticWrongVocabList = ({
  empty,
  items,
  title
}: {
  empty: string;
  items?: WrongVocabResponse[] | null;
  title: string;
}) => (
  <section className="vocab-stat-list">
    <h3>{title}</h3>
    {items?.length ? (
      <div>
        {items.map((item, index) => (
          <article key={item.userVocabId ?? `${item.word}-${index}`}>
            <div>
              <strong>{item.word ?? "Unknown word"}</strong>
            </div>
            <span>{formatStatNumber(item.wrongCount)} wrong</span>
          </article>
        ))}
      </div>
    ) : (
      <p>{empty}</p>
    )}
  </section>
);

const normalizeReviewAnswer = (value?: string | null) =>
  value
    ?.normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ") ?? "";

const getFirstText = (...values: Array<string | null | undefined>) =>
  values.find((value) => Boolean(value?.trim()))?.trim() ?? null;

const getReviewQuestionWord = (question: VocabReviewQuizResponse) =>
  getFirstText(question.word, question.sense?.word, question.example?.word, question.correctAnswer) ?? "Review word";

const getReviewQuestionPos = (question: VocabReviewQuizResponse) =>
  getFirstText(question.pos, question.sense?.pos, question.wordSense?.pos, question.example?.pos) ?? "word";

const getReviewQuestionMeaning = (question: VocabReviewQuizResponse) =>
  getFirstText(
    question.sense?.trans?.shortMeaning,
    question.wordSense?.trans?.shortMeaning,
    question.sense?.shortMeaning,
    question.wordSense?.shortMeaning,
    question.sense?.trans?.definition,
    question.wordSense?.trans?.definition,
    question.sense?.definition,
    question.wordSense?.definition,
    question.trans,
    question.example?.trans
  ) ?? "No meaning was returned.";

const renderReviewSentence = (sentence?: string | null) =>
  parseReviewSentenceMarkup(sentence).map((segment, index) =>
    segment.type === "highlight" ? (
      <mark className="vocab-review-highlight" key={`highlight-${index}`}>
        {segment.text}
      </mark>
    ) : (
      <span key={`text-${index}`}>{segment.text}</span>
    )
  );

const getReviewMetadataOptions = (metadata?: Record<number, string> | null) =>
  Object.entries(metadata ?? {})
    .map(([key, value]) => ({ key, value: value?.trim() ?? "" }))
    .filter((entry) => entry.key && entry.value)
    .sort((left, right) => Number(left.key) - Number(right.key));

const buildReviewSummaryItem = (question: VocabReviewQuizResponse): ReviewSummaryItem => ({
  key: `${question.userVocabId ?? question.wordId ?? getReviewQuestionWord(question)}-${question.exerciseType ?? "review"}`,
  meaning: getReviewQuestionMeaning(question),
  pos: getReviewQuestionPos(question),
  word: getReviewQuestionWord(question)
});

const getReviewMetadataExpectedAnswer = (metadata?: Record<number, string> | null) => {
  const entries = Object.entries(metadata ?? {})
    .map(([index, value]) => ({ index: Number(index), value: value?.trim() ?? "" }))
    .filter((entry) => Number.isFinite(entry.index) && entry.value.length > 0)
    .sort((left, right) => left.index - right.index);

  return entries.map((entry) => entry.value).join("");
};

const getReviewMetadataAnswerLength = (metadata?: Record<number, string> | null) =>
  [...getReviewMetadataExpectedAnswer(metadata)].length;

const isReviewAnswerCorrect = (answer: string, question: VocabReviewQuizResponse) => {
  const normalizedAnswer = normalizeReviewAnswer(answer);
  const metadataExpectedAnswer =
    question.exerciseType === "VOCAB_FILL_MISSING_WORD_PART" ||
    question.exerciseType === "VOCAB_FILL_WORD_IN_SENTENCE_BLANK"
      ? getReviewMetadataExpectedAnswer(question.metadata)
      : "";
  const expectedAnswer = metadataExpectedAnswer || question.correctAnswer;
  const normalizedCorrectAnswer = normalizeReviewAnswer(expectedAnswer);

  if (!normalizedAnswer || !normalizedCorrectAnswer) {
    return false;
  }

  return normalizedAnswer === normalizedCorrectAnswer;
};

const REVIEW_NAMED_BLANK_PATTERN = /\[\s*blank\s*\]|\(\s*blank\s*\)/i;

type ReviewInlinePart =
  | { text: string; type: "text" }
  | { length: number; type: "blank" };

const getReviewAnswerLength = (text: string, fallbackBlankLength: number) => {
  const underscoreCount = [...text].filter((character) => character === "_").length;

  if (underscoreCount > 0) {
    return underscoreCount;
  }

  return Math.max(fallbackBlankLength, 1);
};

const buildReviewInlineParts = (text: string, fallbackBlankLength: number): ReviewInlinePart[] => {
  if (text.includes("_")) {
    const parts: ReviewInlinePart[] = [];
    let currentText = "";
    let currentBlankLength = 0;

    [...text].forEach((character) => {
      if (character === "_") {
        if (currentText) {
          parts.push({ text: currentText, type: "text" });
          currentText = "";
        }

        currentBlankLength += 1;
        return;
      }

      if (currentBlankLength > 0) {
        parts.push({ length: currentBlankLength, type: "blank" });
        currentBlankLength = 0;
      }

      currentText += character;
    });

    if (currentBlankLength > 0) {
      parts.push({ length: currentBlankLength, type: "blank" });
    }

    if (currentText) {
      parts.push({ text: currentText, type: "text" });
    }

    return parts;
  }

  const namedBlankMatch = text.match(REVIEW_NAMED_BLANK_PATTERN);

  if (namedBlankMatch?.index !== undefined) {
    const parts: ReviewInlinePart[] = [
      { text: text.slice(0, namedBlankMatch.index), type: "text" },
      { length: Math.max(fallbackBlankLength, 1), type: "blank" },
      { text: text.slice(namedBlankMatch.index + namedBlankMatch[0].length), type: "text" }
    ];

    return parts.filter((part) => part.type === "blank" || part.text.length > 0);
  }

  return [
    { text, type: "text" },
    { length: Math.max(fallbackBlankLength, 1), type: "blank" }
  ];
};

const getReviewSentenceFillText = (question: VocabReviewQuizResponse) => {
  const sentence = question.sentence?.trim();
  const maskedWord = question.maskedWord?.trim();

  if (!sentence) {
    return maskedWord ?? "____";
  }

  if (!maskedWord || sentence.includes("_") || sentence.includes(maskedWord)) {
    return sentence;
  }

  if (REVIEW_NAMED_BLANK_PATTERN.test(sentence)) {
    return sentence.replace(REVIEW_NAMED_BLANK_PATTERN, maskedWord);
  }

  return sentence;
};

const InlineReviewAnswer = ({
  ariaLabel,
  className = "",
  correctAnswer,
  disabled,
  maskedWord,
  onChange,
  onSubmit,
  text,
  value
}: {
  ariaLabel: string;
  className?: string;
  correctAnswer?: string | null;
  disabled: boolean;
  maskedWord?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  text: string;
  value: string;
}) => {
  const fallbackBlankLength = correctAnswer?.trim().length ?? 0;
  const blankLength = getReviewAnswerLength(text, fallbackBlankLength);
  const inlineParts = buildReviewInlineParts(text, fallbackBlankLength);
  const inlineFocus = splitReviewInlineFocus(text, maskedWord);
  const safeValue = value.slice(0, blankLength);
  const activeSlotIndex = Math.min(safeValue.length, Math.max(blankLength - 1, 0));
  const slotRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!disabled && blankLength > 0) {
      slotRefs.current[activeSlotIndex]?.focus();
    }
  }, [activeSlotIndex, blankLength, disabled]);

  const focusSlot = (index: number) => {
    window.requestAnimationFrame(() => slotRefs.current[index]?.focus());
  };

  const updateSlotValue = (index: number, nextCharacter: string) => {
    if (disabled) {
      return;
    }

    if (index > safeValue.length) {
      focusSlot(activeSlotIndex);
      return;
    }

    const nextValue = `${safeValue.slice(0, index)}${nextCharacter}${safeValue.slice(index + 1)}`.slice(
      0,
      blankLength
    );

    onChange(nextValue);
    focusSlot(Math.min(index + 1, blankLength - 1));
  };

  const removeSlotValue = (index: number) => {
    const removeIndex = safeValue[index] ? index : Math.max(index - 1, 0);
    const nextValue = `${safeValue.slice(0, removeIndex)}${safeValue.slice(removeIndex + 1)}`;

    onChange(nextValue);
    focusSlot(removeIndex);
  };

  const renderSlotInput = (globalIndex: number) => {
    const isActive = globalIndex === activeSlotIndex && !disabled;

    return (
      <span className="vocab-review-slot" key={`slot-${globalIndex}`}>
        <span
          aria-hidden="true"
          className={isActive ? "vocab-review-slot__glyph is-active" : "vocab-review-slot__glyph"}
        >
          {safeValue[globalIndex] ?? "_"}
        </span>
        <input
          aria-label={`${ariaLabel} ${globalIndex + 1}`}
          className={isActive ? "vocab-review-slot-input__control is-active" : "vocab-review-slot-input__control"}
          disabled={disabled}
          maxLength={1}
          onChange={(event) => {
            const enteredCharacters = [...event.target.value];
            updateSlotValue(globalIndex, enteredCharacters[enteredCharacters.length - 1] ?? "");
          }}
          onFocus={() => {
            if (globalIndex > safeValue.length) {
              focusSlot(activeSlotIndex);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
              return;
            }

            if (event.key === "Backspace") {
              event.preventDefault();
              removeSlotValue(globalIndex);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();

            if (globalIndex > safeValue.length) {
              focusSlot(activeSlotIndex);
              return;
            }

            const pastedText = event.clipboardData.getData("text").replace(/\s+/g, "");
            const nextValue = `${safeValue.slice(0, globalIndex)}${pastedText}${safeValue.slice(
              globalIndex + pastedText.length
            )}`.slice(0, blankLength);

            onChange(nextValue);
            focusSlot(Math.min(nextValue.length, blankLength - 1));
          }}
          placeholder="_"
          ref={(element) => {
            slotRefs.current[globalIndex] = element;
          }}
          value={safeValue[globalIndex] ?? ""}
        />
      </span>
    );
  };

  let consumedBlankCount = 0;

  const renderInlineParts = (parts: ReviewInlinePart[], keyPrefix: string) =>
    parts.map((part, partIndex) => {
      if (part.type === "text") {
        return (
          <span className="vocab-review-inline-fill__text" key={`${keyPrefix}-text-${partIndex}`}>
            {part.text}
          </span>
        );
      }

      const startIndex = consumedBlankCount;
      consumedBlankCount += part.length;

      return (
        <span className="vocab-review-slot-input" key={`${keyPrefix}-blank-${partIndex}`}>
          {Array.from({ length: part.length }, (_, slotIndex) => renderSlotInput(startIndex + slotIndex))}
        </span>
      );
    });

  return (
    <div className={`vocab-review-inline-fill ${className}`} aria-label={ariaLabel} role="group">
      {inlineFocus.focus ? (
        <>
          {inlineFocus.before ? (
            <span className="vocab-review-inline-fill__text">{inlineFocus.before}</span>
          ) : null}
          <span className="vocab-review-inline-fill__word">
            {renderInlineParts(buildReviewInlineParts(inlineFocus.focus, fallbackBlankLength), "focus")}
          </span>
          {inlineFocus.after ? (
            <span className="vocab-review-inline-fill__text">{inlineFocus.after}</span>
          ) : null}
        </>
      ) : (
        renderInlineParts(inlineParts, "sentence")
      )}
    </div>
  );
};

const myVocabularySections: Array<{
  description: string;
  icon: "bookmark" | "brain" | "chart" | "quiz";
  key: MyVocabularySection;
  title: string;
}> = [
  {
    description: "Attempts and accuracy for today.",
    icon: "chart",
    key: "daily",
    title: "Daily statistic"
  },
  {
    description: "Longer-term accuracy and weak words.",
    icon: "brain",
    key: "overall",
    title: "Overall statistic"
  },
  {
    description: "Browse saved words by review level.",
    icon: "bookmark",
    key: "list",
    title: "List vocabulary"
  },
  {
    description: "Generate a fresh review session.",
    icon: "quiz",
    key: "review",
    title: "Start review"
  }
];

const modeTitle: Record<VocabularyExploreMode, { description: string; icon: "book" | "bookmark" | "chart"; title: string }> = {
  topics: {
    description: "Explore vocabulary by topic, then pick a direction that fits your day.",
    icon: "book",
    title: "Vocabulary by topic"
  },
  levels: {
    description: "Browse English words from A1 to C2. A1 loads first, higher levels load when selected.",
    icon: "chart",
    title: "Vocabulary by level"
  },
  mine: {
    description: "Your saved words, learning statistics, and review entry points in one calm place.",
    icon: "bookmark",
    title: "My Vocabulary"
  }
};

const iconCycle: Array<"book" | "brain" | "globe" | "headphones" | "reading" | "star"> = [
  "book",
  "brain",
  "globe",
  "headphones",
  "reading",
  "star"
];

const ExploreChrome = ({ children, compactTitle }: { children: ReactNode; compactTitle?: string }) => {
  const navigate = useNavigate();
  const recordSearchHistory = useRecordSearchHistory();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [languageCode, setLanguageCode] = useState("vi");
  const [modalWords, setModalWords] = useState<WordResponse[]>([]);
  const [wordError, setWordError] = useState<string | null>(null);

  const openWord = useMutation({
    mutationFn: ({ transLangCode, word }: { transLangCode: string; word: Word }) => {
      if (!word.id) {
        throw new Error("This word is missing an id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode
      });
    },
    onMutate: () => setWordError(null),
    onSuccess: (word) => {
      setModalWords([word]);
      recordSearchHistory([word]);
    },
    onError: (error) => setWordError(getSafeErrorMessage(error))
  });

  const searchWord = useMutation({
    mutationFn: async ({
      isUniqueSearch,
      text,
      transLangCode
    }: {
      isUniqueSearch: boolean;
      text: string;
      transLangCode: string;
    }) => {
      const results = await searchApi.fullSearch(text, transLangCode);
      return selectFullSearchResults(results, isUniqueSearch);
    },
    onMutate: () => setWordError(null),
    onSuccess: (words) => {
      if (words.length > 0) {
        setModalWords(words);
        recordSearchHistory(words);
      } else {
        setWordError("Word not found.");
      }
    },
    onError: (error) => setWordError(getSafeErrorMessage(error))
  });

  return (
    <div className="guest-home">
      <HomeNavbar
        compactTitle={compactTitle}
        onAuthOpen={() => setIsAuthOpen(true)}
        onLanguageChange={setLanguageCode}
        onProfileOpen={() => setIsAccountOpen(true)}
        onSearchSubmit={(text, nextLanguageCode, isUniqueSearch) => {
          setLanguageCode(nextLanguageCode);
          searchWord.mutate({ text, transLangCode: nextLanguageCode, isUniqueSearch });
        }}
        onSuggestionSelect={(word, nextLanguageCode, isUniqueSearch) => {
          setLanguageCode(nextLanguageCode);

          if (isUniqueSearch) {
            const text = normalizeSearchText(word.normalizedWord ?? word.word ?? "");

            if (text) {
              searchWord.mutate({ text, transLangCode: nextLanguageCode, isUniqueSearch: true });
            }
          } else {
            openWord.mutate({ word, transLangCode: nextLanguageCode });
          }
        }}
        onVocabularySelect={(nextMode) => {
          navigate(
            nextMode === "topics"
              ? ROUTES.vocabularyTopics
              : nextMode === "levels"
                ? ROUTES.vocabularyLevels
                : ROUTES.vocabularyMine
          );
        }}
      />
      <main>
        {wordError ? (
          <div className="home-word-save-message" role="alert">
            {wordError}
          </div>
        ) : null}
        {children}
      </main>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      <HomeWordDetailModal
        onClose={() => setModalWords([])}
        onRequireAuth={() => setIsAuthOpen(true)}
        words={modalWords}
      />
    </div>
  );
};

export const VocabularyExplorePage = ({ mode }: VocabularyExplorePageProps) => {
  const auth = useAuth();
  const details = modeTitle[mode];
  const [isChildHeroCompact, setIsChildHeroCompact] = useState(false);

  return (
    <ExploreChrome compactTitle={details.title}>
      <section
        className={`vocab-route-page vocab-route-page--nav-compact ${
          mode === "mine" && isChildHeroCompact ? "vocab-route-page--child-active" : ""
        }`}
      >
        {!auth.isAuthenticated ? (
          <AuthRequiredNotice
            description="Log in or register an account to browse vocabulary collections, saved words, review sessions, and statistics."
            title="Log in to view vocabulary"
          />
        ) : (
          <>
            {mode === "topics" ? <TopicGrid /> : null}
            {mode === "levels" ? <LevelWordBrowser /> : null}
            {mode === "mine" ? <MyVocabularyPanel onActiveChange={setIsChildHeroCompact} /> : null}
          </>
        )}
      </section>
    </ExploreChrome>
  );
};

const TopicGrid = () => {
  const navigate = useNavigate();
  const categories = useQuery({
    queryKey: ["vocabulary-route", "categories"],
    queryFn: dictionaryApi.getCategories
  });

  if (categories.isLoading) {
    return <div className="vocab-route-loading">Loading topics...</div>;
  }

  if (categories.error) {
    return <div className="vocab-route-error">{getSafeErrorMessage(categories.error)}</div>;
  }

  return (
    <div className="vocab-topic-grid">
      {(categories.data ?? []).map((category, index) => (
        <button
          className="vocab-topic-card"
          disabled={!category.id}
          key={category.id ?? category.slug ?? index}
          onClick={() => {
            if (category.id) {
              navigate(ROUTES.vocabularyTopicWords(category.id));
            }
          }}
          type="button"
        >
          <span>
            <HomeIcon name={iconCycle[index % iconCycle.length]} size={28} />
          </span>
          <h2>{category.name ?? category.slug ?? "Topic"}</h2>
          <p>{category.description ?? "A fresh group of words to explore."}</p>
        </button>
      ))}
    </div>
  );
};

export const VocabularyTopicWordsPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { categoryId = "" } = useParams<{ categoryId: string }>();
  const [page, setPage] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [modalWord, setModalWord] = useState<WordResponse | null>(null);
  const [wordFilter, setWordFilter] = useState("");
  const normalizedWordFilter = wordFilter.trim().toLowerCase();

  const categories = useQuery({
    enabled: auth.isAuthenticated,
    queryKey: ["vocabulary-route", "categories"],
    queryFn: dictionaryApi.getCategories
  });
  const topicWords = useQuery({
    enabled: Boolean(auth.isAuthenticated && categoryId),
    queryKey: ["vocabulary-route", "category-words", categoryId, normalizedWordFilter, page],
    placeholderData: keepPreviousData,
    queryFn: () =>
      normalizedWordFilter
        ? dictionaryApi.searchWordsByCategory({
            categoryId,
            text: normalizedWordFilter,
            isAutocomplete: true,
            limit: 12,
            page
          })
        : dictionaryApi.getWordsByCategory({
            categoryId,
            limit: 12,
            page
          })
  });
  const openWord = useMutation({
    mutationFn: (word: Word) => {
      if (!word.id) {
        throw new Error("This word is missing an id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode: "vi",
        userId: auth.userId
      });
    },
    onSuccess: setModalWord
  });

  const activeCategory = (categories.data ?? []).find((category) => category.id === categoryId);
  const currentContent = topicWords.data?.content ?? [];
  const visibleWords = page === 0 ? currentContent : words;

  useEffect(() => {
    if (!topicWords.data || topicWords.isPlaceholderData) {
      return;
    }

    setWords((current) => (page === 0 ? currentContent : [...current, ...currentContent]));
  }, [currentContent, page, topicWords.data]);

  if (!auth.isAuthenticated) {
    return (
      <ExploreChrome compactTitle="Topic words">
        <section className="vocab-route-page vocab-route-page--nav-compact">
          <AuthRequiredNotice
            description="Log in or register an account to view topic vocabulary and open word details."
            title="Log in to view topic words"
          />
        </section>
      </ExploreChrome>
    );
  }

  return (
    <ExploreChrome compactTitle={activeCategory?.name ?? activeCategory?.slug ?? "Topic words"}>
      <section className="vocab-route-page vocab-route-page--nav-compact">
        <section className="vocab-level-browser vocab-topic-word-panel">
          <div className="vocab-topic-panel-heading">
            <button className="vocab-topic-panel-back" onClick={() => navigate(ROUTES.vocabularyTopics)} type="button">
              <HomeIcon name="chevron" size={17} />
              Back
            </button>
          </div>

          <div className="vocab-topic-toolbar">
            <label>
              <input
                onChange={(event) => {
                  setWordFilter(event.target.value);
                  setPage(0);
                  setWords([]);
                }}
                placeholder="Search word by topic"
                type="search"
                value={wordFilter}
              />
            </label>
          </div>

          <div className="vocab-word-list-frame">
            <div className="vocab-word-list-scroll">
              {topicWords.isLoading && page === 0 ? (
                <div className="vocab-route-loading">Loading topic words...</div>
              ) : null}
              {topicWords.error ? <div className="vocab-route-error">{getSafeErrorMessage(topicWords.error)}</div> : null}

              <div className="vocab-word-rows">
                {visibleWords.map((word) => (
                  <article key={word.id ?? word.word}>
                      <strong>{word.word ?? word.normalizedWord}</strong>
                      <span>{word.pos ?? "word"}</span>
                      <button disabled={openWord.isPending} onClick={() => openWord.mutate(word)} type="button">
                        See more
                      </button>
                  </article>
                ))}
              </div>

              {!topicWords.isLoading && visibleWords.length === 0 ? (
                <div className="vocab-route-empty">
                  <HomeIcon name="search" size={34} />
                  <h2>No words found</h2>
                  <p>{normalizedWordFilter ? "Try another keyword or clear the topic search." : "This topic has no words yet."}</p>
                </div>
              ) : null}
            </div>

            {topicWords.data && !topicWords.data.last ? (
              <button
                className="vocab-route-load-more"
                disabled={topicWords.isFetching}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Load more
              </button>
            ) : null}
          </div>

          {openWord.error ? <div className="vocab-route-error">{getSafeErrorMessage(openWord.error)}</div> : null}
          <HomeWordDetailModal onClose={() => setModalWord(null)} onRequireAuth={() => undefined} word={modalWord} />
        </section>
      </section>
    </ExploreChrome>
  );
};

const LevelWordBrowser = () => {
  const auth = useAuth();
  const [activeLevel, setActiveLevel] = useState("A1");
  const [page, setPage] = useState(0);
  const [words, setWords] = useState<Word[]>([]);
  const [levelSearchText, setLevelSearchText] = useState("");
  const [modalWord, setModalWord] = useState<WordResponse | null>(null);
  const normalizedLevelSearchText = levelSearchText.trim().toLowerCase();

  const levelWords = useQuery({
    enabled: auth.isAuthenticated,
    queryKey: ["vocabulary-route", "level", activeLevel, normalizedLevelSearchText, page],
    placeholderData: keepPreviousData,
    queryFn: () =>
      normalizedLevelSearchText
        ? dictionaryApi.searchWordsByLevel({
            level: activeLevel,
            text: normalizedLevelSearchText,
            isAutocomplete: true,
            limit: 12,
            page
          })
        : dictionaryApi.getWordsByLevel({ level: activeLevel, limit: 12, page })
  });

  const openWord = useMutation({
    mutationFn: (word: Word) => {
      if (!word.id) {
        throw new Error("This word is missing an id.");
      }

      return dictionaryApi.getWordDetail({
        wordId: word.id,
        isTrans: true,
        transLangCode: "vi",
        userId: auth.userId
      });
    },
    onSuccess: setModalWord
  });

  const currentContent = levelWords.data?.content ?? [];
  const visibleWords = page === 0 ? currentContent : words;

  useEffect(() => {
    if (!levelWords.data || levelWords.isPlaceholderData) {
      return;
    }

    setWords((current) => (page === 0 ? currentContent : [...current, ...currentContent]));
  }, [currentContent, levelWords.data, page]);

  if (!auth.isAuthenticated) {
    return (
      <AuthRequiredNotice
        description="Log in or register an account to browse level vocabulary and open full word details."
        title="Log in to view level words"
      />
    );
  }

  return (
    <div className="vocab-level-browser">
      <div className="vocab-level-tabs">
        {certLevels.map((level) => (
          <button
            className={activeLevel === level ? "vocab-level-tabs__active" : ""}
            key={level}
            onClick={() => {
              setActiveLevel(level);
              setPage(0);
              setWords([]);
            }}
            type="button"
          >
            {level}
          </button>
        ))}
      </div>

      <div className="vocab-topic-toolbar vocab-level-search-toolbar">
        <label>
          <span>Search in {activeLevel}</span>
          <input
            onChange={(event) => {
              setLevelSearchText(event.target.value);
              setPage(0);
              setWords([]);
            }}
            placeholder="Find a word in this level"
            type="search"
            value={levelSearchText}
          />
        </label>
      </div>

      <div className="vocab-word-list-frame">
        <div className="vocab-word-list-scroll">
          {levelWords.isLoading && page === 0 ? (
            <div className="vocab-route-loading">
              {normalizedLevelSearchText ? `Searching ${activeLevel} words...` : `Loading ${activeLevel} words...`}
            </div>
          ) : null}
          {levelWords.error ? <div className="vocab-route-error">{getSafeErrorMessage(levelWords.error)}</div> : null}

          <div className="vocab-word-rows">
            {visibleWords.map((word) => (
              <article key={word.id ?? word.word}>
                <strong>{word.word ?? word.normalizedWord}</strong>
                <span>{word.pos ?? "word"}</span>
                <button disabled={openWord.isPending} onClick={() => openWord.mutate(word)} type="button">
                  See more
                </button>
              </article>
            ))}
          </div>

          {!levelWords.isLoading && visibleWords.length === 0 ? (
            <div className="vocab-route-empty">
              <HomeIcon name="search" size={34} />
              <h2>No words found</h2>
              <p>{normalizedLevelSearchText ? "Try another keyword or clear the level search." : "This level has no words yet."}</p>
            </div>
          ) : null}
        </div>

        {levelWords.data && !levelWords.data.last ? (
          <button
            className="vocab-route-load-more"
            disabled={levelWords.isFetching}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Load more
          </button>
        ) : null}
      </div>

      {openWord.error ? <div className="vocab-route-error">{getSafeErrorMessage(openWord.error)}</div> : null}
      <HomeWordDetailModal onClose={() => setModalWord(null)} onRequireAuth={() => undefined} word={modalWord} />
    </div>
  );
};

const MyVocabularyPanel = ({ onActiveChange }: { onActiveChange: (active: boolean) => void }) => {
  const auth = useAuth();
  const [activeSection, setActiveSection] = useState<MyVocabularySection | null>(null);
  const [selectedSavedLevel, setSelectedSavedLevel] = useState<number | null>(null);
  const [savedPage, setSavedPage] = useState(0);
  const [savedModalWord, setSavedModalWord] = useState<WordResponse | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewQuestions, setReviewQuestions] = useState<VocabReviewQuizResponse[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewAnswer, setReviewAnswer] = useState("");
  const [reviewReplayCount, setReviewReplayCount] = useState(0);
  const [reviewAttemptResult, setReviewAttemptResult] = useState<UserVocabAttemptResponse | null>(null);
  const [reviewResultPopup, setReviewResultPopup] = useState<ReviewResultPopupState | null>(null);
  const [reviewSummaryItems, setReviewSummaryItems] = useState<{
    correct: ReviewSummaryItem[];
    wrong: ReviewSummaryItem[];
  }>({ correct: [], wrong: [] });
  const [isReviewEnglishMeaningOpen, setIsReviewEnglishMeaningOpen] = useState(false);
  const [isReviewExampleTransOpen, setIsReviewExampleTransOpen] = useState(false);
  const [isReviewMoreExampleOpen, setIsReviewMoreExampleOpen] = useState(false);
  const [isReviewSentenceMeaningOpen, setIsReviewSentenceMeaningOpen] = useState(false);
  const [selectedReviewTotal, setSelectedReviewTotal] = useState<ReviewVocabTotal>(60);
  const [selectedReviewReminderTotal, setSelectedReviewReminderTotal] = useState(60);
  const [pendingReviewReminderTotal, setPendingReviewReminderTotal] = useState(60);
  const [isReviewReminderPickerOpen, setIsReviewReminderPickerOpen] = useState(false);
  const [isReviewScreenOpen, setIsReviewScreenOpenState] = useState(false);
  const [isReviewExitConfirmOpen, setIsReviewExitConfirmOpen] = useState(false);
  const [isReviewZeroGeneratedOpen, setIsReviewZeroGeneratedOpen] = useState(false);
  const isAdvancingReviewRef = useRef(false);
  const isSubmittingReviewRef = useRef(false);
  const isReviewScreenOpenRef = useRef(false);
  const lastAutoPlayedReviewPopupRef = useRef<ReviewResultPopupState | null>(null);
  const reviewAudioPoolRef = useRef<ReviewAudioPool | null>(null);
  const reviewRequestIdRef = useRef(0);
  const reviewScreenRef = useRef<HTMLDivElement>(null);
  if (!reviewAudioPoolRef.current && typeof Audio !== "undefined") {
    reviewAudioPoolRef.current = new ReviewAudioPool((url) => new Audio(url));
  }

  const setReviewScreenOpen = (nextOpen: boolean) => {
    isReviewScreenOpenRef.current = nextOpen;
    setIsReviewScreenOpenState(nextOpen);
  };

  useEffect(() => {
    setSelectedSavedLevel(null);
    setSavedPage(0);
  }, [auth.userId]);

  const daily = useQuery({
    enabled: Boolean(auth.userId && activeSection === "daily"),
    queryKey: ["vocabulary-route", "daily-stat", auth.userId],
    queryFn: () => statisticsApi.getDaily(auth.userId as string)
  });
  const overall = useQuery({
    enabled: Boolean(auth.userId && activeSection === "overall"),
    queryKey: ["vocabulary-route", "overall-stat", auth.userId],
    queryFn: () => statisticsApi.getOverall(auth.userId as string)
  });
  const vocabularyQuantity = useQuery({
    enabled: Boolean(auth.userId && activeSection === "list"),
    queryKey: queryKeys.vocabularyInfo(auth.userId, "VOCAB_QUANTITY"),
    queryFn: () =>
      vocabularyApi.getVocabularyInfo({
        userId: auth.userId as string,
        infoType: "VOCAB_QUANTITY"
      })
  });
  const saved = useQuery({
    enabled: Boolean(
      auth.userId && activeSection === "list" && selectedSavedLevel !== null
    ),
    queryKey: queryKeys.savedVocabularies(
      auth.userId,
      selectedSavedLevel ?? undefined,
      savedPage,
      SAVED_VOCABULARY_PAGE_SIZE
    ),
    queryFn: () =>
      vocabularyApi.getSavedVocabulariesByLevel({
        userId: auth.userId as string,
        level: selectedSavedLevel as number,
        page: savedPage,
        limit: SAVED_VOCABULARY_PAGE_SIZE
      }),
    placeholderData: (previousData, previousQuery) =>
      canReuseSavedVocabularyPage(previousQuery?.queryKey, {
        userId: auth.userId,
        level: selectedSavedLevel,
        limit: SAVED_VOCABULARY_PAGE_SIZE
      })
        ? previousData
        : undefined
  });
  const reviewQuantity = useQuery({
    enabled: Boolean(auth.userId && activeSection === "review"),
    queryKey: queryKeys.vocabularyInfo(auth.userId, "VOCAB_REVIEW"),
    queryFn: () =>
      vocabularyApi.getVocabularyInfo({
        userId: auth.userId as string,
        infoType: "VOCAB_REVIEW"
      })
  });
  const review = useMutation({
    onMutate: () => {
      const requestId = reviewRequestIdRef.current + 1;

      reviewRequestIdRef.current = requestId;
      setReviewScreenOpen(true);
      setReviewMessage(null);
      setReviewQuestions([]);
      setReviewIndex(0);
      setReviewAnswer("");
      setReviewReplayCount(0);
      setReviewAttemptResult(null);
      setReviewResultPopup(null);
      setReviewSummaryItems({ correct: [], wrong: [] });
      setIsReviewEnglishMeaningOpen(false);
      setIsReviewExampleTransOpen(false);
      setIsReviewMoreExampleOpen(false);
      setIsReviewSentenceMeaningOpen(false);
      setIsReviewExitConfirmOpen(false);
      setIsReviewZeroGeneratedOpen(false);
      isAdvancingReviewRef.current = false;
      isSubmittingReviewRef.current = false;

      return { requestId };
    },
    mutationFn: () => {
      if (!auth.userId) {
        throw new Error("Please sign in before starting review.");
      }

      return reviewApi.getReviewSession({ userId: auth.userId, totalReviewVocab: selectedReviewTotal, langCode: "vi" });
    },
    onSuccess: (items, _variables, context) => {
      if (!context || context.requestId !== reviewRequestIdRef.current || !isReviewScreenOpenRef.current) {
        return;
      }

      if (items.length === 0) {
        setReviewScreenOpen(false);
        setReviewMessage(null);
        setReviewQuestions([]);
        setReviewIndex(0);
        setReviewAnswer("");
        setReviewReplayCount(0);
        setReviewAttemptResult(null);
        setReviewResultPopup(null);
        setReviewSummaryItems({ correct: [], wrong: [] });
        setIsReviewEnglishMeaningOpen(false);
        setIsReviewExampleTransOpen(false);
        setIsReviewMoreExampleOpen(false);
        setIsReviewSentenceMeaningOpen(false);
        setIsReviewZeroGeneratedOpen(true);
        isAdvancingReviewRef.current = false;
        isSubmittingReviewRef.current = false;
        return;
      }

      setReviewQuestions(items);
      setReviewIndex(0);
      setReviewAnswer("");
      setReviewReplayCount(0);
      setReviewAttemptResult(null);
      setReviewResultPopup(null);
      setReviewSummaryItems({ correct: [], wrong: [] });
      setIsReviewEnglishMeaningOpen(false);
      setIsReviewExampleTransOpen(false);
      setIsReviewMoreExampleOpen(false);
      setIsReviewSentenceMeaningOpen(false);
      isAdvancingReviewRef.current = false;
      isSubmittingReviewRef.current = false;
      setReviewMessage(null);
    },
    onError: (error, _variables, context) => {
      if (context && context.requestId !== reviewRequestIdRef.current) {
        return;
      }

      setReviewScreenOpen(false);
      setReviewMessage(getSafeErrorMessage(error));
    }
  });
  const generateWrongReviewQuestion = useMutation({
    mutationFn: (question: VocabReviewQuizResponse) => {
      if (!auth.userId) {
        throw new Error("Please sign in before generating another review question.");
      }

      if (!question.userVocabId) {
        throw new Error("This question cannot generate another review item.");
      }

      return reviewApi.getReviewQuestionForWord({
        userId: auth.userId,
        userVocabId: question.userVocabId,
        langCode: "vi"
      });
    }
  });
  const submitReviewAttempt = useMutation({
    mutationFn: ({
      answer,
      correct,
      question,
      replayCount
    }: {
      answer: string;
      correct: boolean;
      question: VocabReviewQuizResponse;
      replayCount: number;
    }) => {
      if (!auth.userId) {
        throw new Error("Please sign in before submitting review.");
      }

      if (!question.exerciseType || question.exerciseType === "LAT_LISTEN_AND_TYPE") {
        throw new Error("This review question type is not supported here.");
      }

      return reviewApi.submitReviewAnswer({
        userId: auth.userId,
        userVocabId: question.userVocabId ?? null,
        exerciseType: question.exerciseType,
        userAnswer: answer,
        correct,
        replayCount:
          question.exerciseType === "VOCAB_LISTEN_AND_TYPE_WORD" ||
          question.exerciseType === "VOCAB_MEANING_TO_SOUND" ||
          question.exerciseType === "VOCAB_SENTENCE_BLANK_TO_SOUND"
            ? replayCount
            : null
      });
    },
    onSuccess: (attempt, variables) => {
      const resolvedAttempt = { ...attempt, correct: attempt.correct ?? variables.correct };

      isAdvancingReviewRef.current = false;
      setReviewSummaryItems((current) => {
        const nextItem = buildReviewSummaryItem(variables.question);

        return resolvedAttempt.correct
          ? { ...current, correct: [...current.correct, nextItem] }
          : { ...current, wrong: [...current.wrong, nextItem] };
      });
      setReviewAttemptResult(resolvedAttempt);
      setReviewResultPopup({ attempt: resolvedAttempt, question: variables.question });
      setIsReviewEnglishMeaningOpen(false);
      setIsReviewExampleTransOpen(false);
      setIsReviewMoreExampleOpen(false);
      setReviewMessage(resolvedAttempt.correct ? "Correct answer." : "Not quite. Review the answer and continue.");
    },
    onError: (error) => setReviewMessage(getSafeErrorMessage(error)),
    onSettled: () => {
      isSubmittingReviewRef.current = false;
    }
  });
  const openSavedWord = useMutation({
    mutationFn: (userVocabId: string) => vocabularyApi.getSavedVocabularyWord(userVocabId),
    onSuccess: setSavedModalWord
  });

  const activeStatistic = activeSection === "daily" ? daily.data : activeSection === "overall" ? overall.data : null;
  const activeStatisticError = activeSection === "daily" ? daily.error : activeSection === "overall" ? overall.error : null;
  const activeSectionDetails = myVocabularySections.find((section) => section.key === activeSection) ?? null;
  const vocabularyLevelQuantities = normalizeVocabularyLevelQuantities(
    vocabularyQuantity.data?.quantityByLevels
  );
  const selectedSavedLevelQuantity = vocabularyLevelQuantities.find(
    (item) => item.level === selectedSavedLevel
  )?.quantity ?? 0;
  const currentReviewQuestion = reviewQuestions[reviewIndex] ?? null;
  const nextReviewQuestion = reviewQuestions[reviewIndex + 1] ?? null;
  const currentReviewType =
    currentReviewQuestion?.exerciseType && currentReviewQuestion.exerciseType !== "LAT_LISTEN_AND_TYPE"
      ? currentReviewQuestion.exerciseType
      : null;
  const currentReviewMetadataOptions = currentReviewQuestion
    ? getReviewMetadataOptions(currentReviewQuestion.metadata)
    : [];
  const currentReviewPos = currentReviewQuestion ? getReviewQuestionPos(currentReviewQuestion) : null;
  const isReviewSessionComplete = reviewQuestions.length > 0 && reviewIndex >= reviewQuestions.length;
  const reviewProgressText = reviewQuestions.length > 0
    ? `${Math.min(reviewIndex + 1, reviewQuestions.length)} / ${reviewQuestions.length}`
    : "No session yet";
  const reviewCurrentStep = reviewQuestions.length > 0 ? Math.min(reviewIndex + 1, reviewQuestions.length) : 0;
  const reviewProgressPercent =
    reviewQuestions.length > 0 ? Math.min((reviewCurrentStep / reviewQuestions.length) * 100, 100) : 0;
  const isCurrentFillQuestion =
    currentReviewType === "VOCAB_FILL_MISSING_WORD_PART" ||
    currentReviewType === "VOCAB_FILL_WORD_IN_SENTENCE_BLANK";
  const currentFillAnswerLength =
    currentReviewQuestion && currentReviewType === "VOCAB_FILL_MISSING_WORD_PART"
      ? getReviewMetadataAnswerLength(currentReviewQuestion.metadata) ||
        getReviewAnswerLength(
          currentReviewQuestion.maskedWord ?? "____",
          currentReviewQuestion.correctAnswer?.trim().length ?? 0
        )
      : currentReviewQuestion && currentReviewType === "VOCAB_FILL_WORD_IN_SENTENCE_BLANK"
        ? getReviewMetadataAnswerLength(currentReviewQuestion.metadata) ||
          getReviewAnswerLength(
            getReviewSentenceFillText(currentReviewQuestion),
            currentReviewQuestion.correctAnswer?.trim().length ?? 0
          )
        : 0;
  const hasCompletedFillAnswer =
    !isCurrentFillQuestion || reviewAnswer.trim().length >= currentFillAnswerLength;
  const reviewResultWord = reviewResultPopup
    ? getFirstText(
        reviewResultPopup.question.word,
        reviewResultPopup.question.sense?.word,
        reviewResultPopup.question.wordSense?.word,
        reviewResultPopup.question.example?.word,
        reviewResultPopup.question.correctAnswer
      )
    : null;
  const reviewResultPos = reviewResultPopup ? getReviewQuestionPos(reviewResultPopup.question) : null;
  const reviewResultSoundUrl = reviewResultPopup
    ? getReviewResultSoundUrl(reviewResultPopup.question)
    : null;
  const reviewResultIpa = reviewResultPopup
    ? getFirstText(reviewResultPopup.question.sound?.ipa, reviewResultPopup.question.sound?.enpr)
    : null;
  const reviewResultMeaningPresentation = reviewResultPopup
    ? getReviewMeaningPresentation(reviewResultPopup.question)
    : null;
  const reviewResultEnglishMeaning = reviewResultMeaningPresentation?.englishMeaning ?? null;
  const reviewResultVietnameseMeaning = reviewResultMeaningPresentation?.vietnameseMeaning ?? null;
  const reviewResultPrimaryMeaning = reviewResultVietnameseMeaning ?? reviewResultEnglishMeaning;
  const canToggleReviewEnglishMeaning = Boolean(
    reviewResultVietnameseMeaning && reviewResultEnglishMeaning
  );
  const reviewResultExamplePresentation = reviewResultPopup
    ? getReviewResultExamplePresentation(reviewResultPopup.question)
    : null;
  const isReviewResultSentenceQuestion = reviewResultExamplePresentation?.isCompletedSentence ?? false;
  const reviewResultExample = reviewResultExamplePresentation?.sentence ?? null;
  const reviewResultExampleTrans = reviewResultExamplePresentation?.translation ?? null;
  const reviewResultExtraExample = reviewResultExamplePresentation?.extraSentence ?? null;
  const reviewResultExtraExampleTrans = reviewResultExamplePresentation?.extraTranslation ?? null;
  const hasDifferentReviewResultExtraExample = Boolean(reviewResultExtraExample);
  const currentReviewSentenceMeaning = currentReviewQuestion
    ? getFirstText(currentReviewQuestion.trans, currentReviewQuestion.example?.trans)
    : null;
  const hasReviewSummaryItems = reviewSummaryItems.correct.length + reviewSummaryItems.wrong.length > 0;
  const shouldShowReviewSummaryPopup = isReviewSessionComplete && hasReviewSummaryItems && !reviewResultPopup;
  const isReviewStandaloneVisible = activeSection === "review" && isReviewScreenOpen && (review.isPending || reviewQuestions.length > 0);

  useEffect(() => {
    onActiveChange(Boolean(activeSection));

    return () => onActiveChange(false);
  }, [activeSection, onActiveChange]);

  useEffect(() => {
    reviewAudioPoolRef.current?.preload(
      getReviewPreloadUrls([
        currentReviewQuestion,
        nextReviewQuestion,
        reviewResultPopup?.question
      ])
    );
  }, [currentReviewQuestion, nextReviewQuestion, reviewResultPopup]);

  useEffect(() => {
    if (!reviewResultPopup || !reviewResultSoundUrl) {
      reviewAudioPoolRef.current?.stop();
      lastAutoPlayedReviewPopupRef.current = null;
      return;
    }

    if (lastAutoPlayedReviewPopupRef.current === reviewResultPopup) {
      return;
    }

    lastAutoPlayedReviewPopupRef.current = reviewResultPopup;
    void reviewAudioPoolRef.current?.play(reviewResultSoundUrl);
  }, [reviewResultPopup, reviewResultSoundUrl]);

  useEffect(
    () => () => {
      reviewAudioPoolRef.current?.clear();
    },
    []
  );

  const canSubmitReviewAnswer = Boolean(
    reviewAnswer.trim() && hasCompletedFillAnswer && !reviewAttemptResult && !submitReviewAttempt.isPending
  );

  const submitCurrentReviewAnswer = () => {
    if (!currentReviewQuestion || !canSubmitReviewAnswer || isSubmittingReviewRef.current) {
      return;
    }

    isSubmittingReviewRef.current = true;
    const answer = reviewAnswer.trim();
    const correct = isReviewAnswerCorrect(answer, currentReviewQuestion);
    submitReviewAttempt.mutate({
      answer,
      correct,
      question: currentReviewQuestion,
      replayCount: reviewReplayCount
    });
  };

  const goToNextReviewQuestion = () => {
    setReviewIndex(Math.min(reviewIndex + 1, reviewQuestions.length));
    setReviewAnswer("");
    setReviewReplayCount(0);
    setReviewAttemptResult(null);
    setReviewMessage(null);
    setIsReviewMoreExampleOpen(false);
    setIsReviewSentenceMeaningOpen(false);
  };

  const closeReviewResultPopup = () => {
    if (isAdvancingReviewRef.current) {
      return;
    }

    const popup = reviewResultPopup;

    isAdvancingReviewRef.current = true;
    setReviewResultPopup(null);
    setIsReviewEnglishMeaningOpen(false);
    setIsReviewExampleTransOpen(false);
    setIsReviewMoreExampleOpen(false);

    if (popup?.attempt.correct === false && popup.question.userVocabId) {
      const requestId = reviewRequestIdRef.current;

      void generateWrongReviewQuestion
        .mutateAsync(popup.question)
        .then((response) => {
          setReviewQuestions((current) =>
            appendGeneratedReviewQuestionForSession(current, response, {
              activeRequestId: reviewRequestIdRef.current,
              isOpen: isReviewScreenOpenRef.current,
              requestId
            })
          );
        })
        .catch(() => undefined);
    }

    goToNextReviewQuestion();
  };

  useEffect(() => {
    if (!reviewResultPopup) {
      return;
    }

    const closeResultOnEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }

      const target = event.target;
      const hasInteractiveTarget =
        target instanceof HTMLElement &&
        Boolean(
          target.closest("input, textarea, select, button, form, [contenteditable='true']")
        );

      if (shouldIgnoreReviewResultEnter(event.defaultPrevented, hasInteractiveTarget)) {
        return;
      }

      event.preventDefault();
      closeReviewResultPopup();
    };

    window.addEventListener("keydown", closeResultOnEnter);

    return () => window.removeEventListener("keydown", closeResultOnEnter);
  }, [reviewResultPopup]);

  const exitReviewSession = () => {
    reviewRequestIdRef.current += 1;
    setReviewScreenOpen(false);
    setReviewQuestions([]);
    setReviewIndex(0);
    setReviewAnswer("");
    setReviewReplayCount(0);
    setReviewAttemptResult(null);
    setReviewResultPopup(null);
    setReviewSummaryItems({ correct: [], wrong: [] });
    setReviewMessage(null);
    setIsReviewEnglishMeaningOpen(false);
    setIsReviewExampleTransOpen(false);
    setIsReviewMoreExampleOpen(false);
    setIsReviewSentenceMeaningOpen(false);
    setIsReviewExitConfirmOpen(false);
    isAdvancingReviewRef.current = false;
    isSubmittingReviewRef.current = false;
    setActiveSection(null);
  };

  const playReviewAudio = () => {
    if (!currentReviewQuestion?.audioUrl) {
      return;
    }

    setReviewReplayCount((current) => current + 1);
    void reviewAudioPoolRef.current?.play(currentReviewQuestion.audioUrl);
  };

  const playReviewSoundUrl = (soundUrl?: string | null, shouldCountReplay = false) => {
    if (!soundUrl?.trim()) {
      return;
    }

    if (shouldCountReplay) {
      setReviewReplayCount((current) => current + 1);
    }

    void reviewAudioPoolRef.current?.play(soundUrl);
  };

  const activeSectionClass = activeSection ? `vocab-my-panel--${activeSection}` : "";
  const activeContentClass = activeSection ? `vocab-my-content--${activeSection}` : "";

  if (!auth.isAuthenticated) {
    return (
      <div className="vocab-route-empty">
        <HomeIcon name="login" size={42} />
        <h2>Sign in to view My Vocabulary</h2>
        <p>Saved words, statistics, and review sessions are connected to your account.</p>
      </div>
    );
  }

  return (
    <div
      className={`vocab-my-panel ${activeSection ? "vocab-my-panel--active" : ""} ${activeSectionClass} ${
        isReviewStandaloneVisible ? "vocab-my-panel--review-screen" : ""
      }`}
    >
      {!isReviewStandaloneVisible ? (
        <div className={activeSection ? "vocab-my-rail" : "vocab-my-actions"}>
          {myVocabularySections.map((section) => (
            <button
              className={activeSection === section.key ? "vocab-my-action--active" : ""}
              key={section.key}
              onClick={() => {
                if (section.key === "list") {
                  setSelectedSavedLevel(null);
                  setSavedPage(0);
                }

                setActiveSection(section.key);
              }}
              type="button"
            >
              <HomeIcon name={section.icon} size={activeSection ? 23 : 24} />
              <strong>{section.title}</strong>
              {!activeSection ? <span>{section.description}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {activeSection ? (
        <section
          className={`vocab-my-content ${activeContentClass} ${
            isReviewStandaloneVisible ? "vocab-my-content--review-screen" : ""
          }`}
        >
          {activeSectionDetails && !(activeSection === "review" && isReviewStandaloneVisible) ? (
            <div className="vocab-my-content__header">
              <span>
                <HomeIcon name={activeSectionDetails.icon} size={22} />
              </span>
              <div>
                <h2>{activeSectionDetails.title}</h2>
                <p>{activeSectionDetails.description}</p>
              </div>
            </div>
          ) : null}

          {activeSection === "daily" || activeSection === "overall" ? (
            <div className="vocab-stat-panel">
              {(daily.isLoading || overall.isLoading) && !activeStatistic ? <p>Loading statistic...</p> : null}
              {activeStatisticError ? <p>{getSafeErrorMessage(activeStatisticError)}</p> : null}
              {activeStatistic ? (
                <div className="vocab-stat-layout">
                  <div className="vocab-stat-metrics">
                    <div className="vocab-stat-groups">
                      {statisticMetricSections(activeStatistic, activeSection).map((section) => (
                        <section className={`vocab-stat-section ${section.className}`} key={section.title}>
                          <h3>{section.title}</h3>
                          <div className="vocab-stat-grid">
                            {section.metrics.map((metric) => (
                              <article key={metric.label}>
                                <span>{metric.label}</span>
                                <strong>{formatStatNumber(metric.value)}</strong>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </div>
                  <div className="vocab-stat-side">
                    {activeSection === "daily" ? (
                      <StatisticWrongVocabList
                        empty="No wrong vocabulary was returned for today."
                        items={activeStatistic.wrongVocabIds}
                        title="Wrong vocabulary"
                      />
                    ) : (
                      <StatisticWrongVocabList
                        empty="No high-frequency wrong vocabulary yet."
                        items={activeStatistic.mostWrongVocabIds}
                        title="Most wrong vocabulary"
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeSection === "list" ? (
            <>
              {selectedSavedLevel === null ? (
                <div className="vocab-saved-level-overview">
                  {vocabularyQuantity.isLoading ? (
                    <p className="vocab-saved-inline-state">Loading vocabulary quantities...</p>
                  ) : null}
                  {vocabularyQuantity.error ? (
                    <div className="vocab-saved-inline-state vocab-saved-inline-state--error">
                      <p>{getSafeErrorMessage(vocabularyQuantity.error)}</p>
                      <button onClick={() => void vocabularyQuantity.refetch()} type="button">
                        Retry
                      </button>
                    </div>
                  ) : null}
                  {vocabularyQuantity.data ? (
                    <>
                      <div className="vocab-saved-level-toolbar">
                        <div aria-label="Total vocabulary" className="vocab-saved-level-total">
                          <span>Total</span>
                          <strong>{formatStatNumber(vocabularyQuantity.data.totalQuantity)}</strong>
                        </div>
                        <SavedVocabularySearch
                          onSelect={(userVocabId) => openSavedWord.mutate(userVocabId)}
                        />
                      </div>
                      <div className="vocab-saved-level-list">
                        {vocabularyLevelQuantities.map((levelInfo) => (
                          <button
                            className="vocab-saved-level-row"
                            key={levelInfo.level}
                            onClick={() => {
                              setSelectedSavedLevel(levelInfo.level);
                              setSavedPage(0);
                            }}
                            type="button"
                          >
                            <span>Level {levelInfo.level}</span>
                            <strong>{formatStatNumber(levelInfo.quantity)}</strong>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="vocab-saved-level-detail">
                  <div className="vocab-saved-level-detail__header">
                    <button
                      onClick={() => {
                        setSelectedSavedLevel(null);
                        setSavedPage(0);
                      }}
                      type="button"
                    >
                      <HomeIcon name="chevron" size={18} />
                      Back to levels
                    </button>
                    <div>
                      <span>Selected collection</span>
                      <strong>Level {selectedSavedLevel}</strong>
                      <small>{formatStatNumber(selectedSavedLevelQuantity)} saved words</small>
                    </div>
                  </div>

                  {saved.isLoading && !saved.data ? (
                    <p className="vocab-saved-inline-state">Loading saved words...</p>
                  ) : null}
                  {saved.error ? (
                    <div className="vocab-saved-inline-state vocab-saved-inline-state--error">
                      <p>{getSafeErrorMessage(saved.error)}</p>
                      <button onClick={() => void saved.refetch()} type="button">
                        Retry
                      </button>
                    </div>
                  ) : null}
                  {saved.data ? (
                    <>
                      {saved.isFetching ? <p className="vocab-saved-inline-state">Loading page...</p> : null}
                      <div className="vocab-word-rows">
                        {saved.data.content.map((item) => (
                          <article key={item.id ?? item.wordId}>
                            <strong>{item.word ?? "Saved word"}</strong>
                            <span>Level {item.level ?? selectedSavedLevel}</span>
                            {item.id ? (
                              <button
                                disabled={openSavedWord.isPending}
                                onClick={() => openSavedWord.mutate(item.id as string)}
                                type="button"
                              >
                                See more
                              </button>
                            ) : (
                              <span>{item.nextReviewAt ? `Next: ${item.nextReviewAt}` : "No schedule"}</span>
                            )}
                          </article>
                        ))}
                      </div>
                      {saved.data.content.length === 0 ? (
                        <p className="vocab-saved-inline-state">No saved words were returned for this level.</p>
                      ) : null}
                      {saved.data.totalPages > 0 ? (
                        <div className="vocab-saved-pagination">
                          <button
                            disabled={saved.isFetching || saved.data.first}
                            onClick={() => setSavedPage((current) => Math.max(current - 1, 0))}
                            type="button"
                          >
                            Previous
                          </button>
                          <span>Page {saved.data.number + 1} / {saved.data.totalPages}</span>
                          <button
                            disabled={saved.isFetching || saved.data.last}
                            onClick={() => setSavedPage((current) => current + 1)}
                            type="button"
                          >
                            Next
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}
              {openSavedWord.error ? (
                <p className="vocab-saved-inline-state vocab-saved-inline-state--error">
                  {getSafeErrorMessage(openSavedWord.error)}
                </p>
              ) : null}
              <HomeWordDetailModal
                onClose={() => setSavedModalWord(null)}
                onRequireAuth={() => undefined}
                word={savedModalWord}
              />
            </>
          ) : null}

          {activeSection === "review" ? (
            <div
              className={isReviewStandaloneVisible ? "vocab-review-screen" : "vocab-review-start"}
              ref={reviewScreenRef}
            >
              {isReviewStandaloneVisible ? (
                <FloatingVocabularyLookup
                  anchorRef={reviewScreenRef}
                  languageCode="vi"
                  onRequireAuth={() => undefined}
                  userId={auth.userId}
                />
              ) : null}
              {isReviewStandaloneVisible ? (
                <div className="vocab-review-screen__header">
                  <div>
                    <span>Review session</span>
                    <strong>{review.isPending && reviewQuestions.length === 0 ? "Preparing your quiz" : "Focus mode"}</strong>
                  </div>
                  <button onClick={() => setIsReviewExitConfirmOpen(true)} type="button">
                    <HomeIcon name="close" size={18} />
                    Exit
                  </button>
                </div>
              ) : null}

              {review.isPending && reviewQuestions.length === 0 ? (
                <div className="vocab-review-loading" role="status">
                  <span>
                    <HomeIcon name="brain" size={34} />
                  </span>
                  <div>
                    <h3>Generating review</h3>
                    <p>Preparing a focused set of {selectedReviewTotal} vocabulary questions.</p>
                  </div>
                  <div className="vocab-review-loading__bar">
                    <span />
                  </div>
                </div>
              ) : null}

              {!isReviewStandaloneVisible ? (
                <>
                  {reviewQuantity.isPending ? (
                    <p className="vocab-review-ready-state">Loading ready vocabulary...</p>
                  ) : reviewQuantity.isError ? (
                    <p className="vocab-review-ready-state vocab-review-ready-state--error">
                      Unable to load the review quantity.{" "}
                      <button onClick={() => reviewQuantity.refetch()} type="button">
                        Retry
                      </button>
                    </p>
                  ) : (
                    <div className="vocab-review-ready-count">
                      <span>Ready to review</span>
                      <strong>{formatStatNumber(reviewQuantity.data?.reviewQuantity)}</strong>
                    </div>
                  )}
                  <div className="vocab-review-reminder">
                    <span>
                      <HomeIcon name="bell" size={22} />
                    </span>
                    <div>
                      <h3>Review reminder</h3>
                      <p>Notify me when this many saved words are ready to review.</p>
                    </div>
                    <div className="vocab-review-reminder-picker">
                      <button
                        aria-expanded={isReviewReminderPickerOpen}
                        aria-haspopup="listbox"
                        className="vocab-review-reminder-picker__value"
                        onClick={() => {
                          setPendingReviewReminderTotal(selectedReviewReminderTotal);
                          setIsReviewReminderPickerOpen((current) => !current);
                        }}
                        type="button"
                      >
                        {selectedReviewReminderTotal}
                      </button>
                      {isReviewReminderPickerOpen ? (
                        <div className="vocab-review-reminder-picker__menu">
                          <div className="vocab-review-reminder-picker__list" role="listbox" aria-label="Review reminder vocabulary count">
                            {reviewReminderTotalOptions.map((total) => (
                              <button
                                aria-selected={pendingReviewReminderTotal === total}
                                className={pendingReviewReminderTotal === total ? "vocab-review-reminder-picker__option--active" : ""}
                                key={`reminder-${total}`}
                                onClick={() => setPendingReviewReminderTotal(total)}
                                role="option"
                                type="button"
                              >
                                {total}
                              </button>
                            ))}
                          </div>
                          <button
                            className="vocab-review-reminder-picker__submit"
                            onClick={() => {
                              setSelectedReviewReminderTotal(pendingReviewReminderTotal);
                              setIsReviewReminderPickerOpen(false);
                            }}
                            type="button"
                          >
                            Submit
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="vocab-review-start__top">
                    <span>
                      <HomeIcon name="quiz" size={28} />
                    </span>
                    <div>
                      <h3>Ready for a focused review?</h3>
                      <p>Generate a mixed session from your saved vocabulary queue.</p>
                    </div>
                    <div className="vocab-review-start__actions">
                      <div className="vocab-review-choice-group" aria-label="Review vocabulary count">
                        {reviewVocabTotalOptions.map((total) => (
                          <button
                            className={selectedReviewTotal === total ? "vocab-review-choice--active" : ""}
                            disabled={review.isPending}
                            key={`review-${total}`}
                            onClick={() => setSelectedReviewTotal(total)}
                            type="button"
                          >
                            {total}
                          </button>
                        ))}
                      </div>
                      <button disabled={review.isPending} onClick={() => review.mutate()} type="button">
                        {review.isPending ? "Generating..." : "Start review"}
                      </button>
                    </div>
                  </div>
                </>
              ) : reviewQuestions.length > 0 ? (
                <div className="vocab-review-progress" aria-label={`Review progress ${reviewProgressText}`}>
                  <div className="vocab-review-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={reviewQuestions.length} aria-valuenow={reviewCurrentStep}>
                    <span style={{ width: `${reviewProgressPercent}%` }} />
                  </div>
                </div>
              ) : null}

              {reviewMessage && !isReviewStandaloneVisible && reviewQuestions.length === 0 ? <p className="vocab-review-message">{reviewMessage}</p> : null}

              {currentReviewQuestion && currentReviewType ? (
                <article className="vocab-review-attempt">
                  {currentReviewType === "VOCAB_WORD_TO_MEANING" ? (
                    <div className="vocab-review-question">
                      <div className="vocab-review-word-prompt">
                        <strong>{currentReviewQuestion.word ?? currentReviewQuestion.metadata?.[0] ?? "Choose the best meaning."}</strong>
                        {currentReviewPos ? <span>{currentReviewPos}</span> : null}
                      </div>
                      <div className="vocab-review-options">
                        {(currentReviewQuestion.listAnswers ?? []).map((answer) => (
                          <button
                            className={reviewAnswer === answer ? "vocab-review-options__active" : ""}
                            disabled={Boolean(reviewAttemptResult)}
                            key={answer}
                            onClick={() => setReviewAnswer(answer)}
                            type="button"
                          >
                            {answer}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_FILL_MISSING_WORD_PART" ? (
                    <div className="vocab-review-question">
                      <div className="vocab-review-word-meaning">
                        <span>
                          Meaning
                          {currentReviewPos ? <em>{currentReviewPos}</em> : null}
                        </span>
                        <p>{getReviewQuestionMeaning(currentReviewQuestion)}</p>
                      </div>
                      <InlineReviewAnswer
                        ariaLabel="Missing word part"
                        className="vocab-review-inline-fill--word"
                        correctAnswer={currentReviewQuestion.correctAnswer}
                        disabled={Boolean(reviewAttemptResult)}
                        onChange={setReviewAnswer}
                        onSubmit={submitCurrentReviewAnswer}
                        text={currentReviewQuestion.maskedWord ?? "____"}
                        value={reviewAnswer}
                      />
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_MEANING_TO_SOUND" ? (
                    <div className="vocab-review-question">
                      <div className="vocab-review-word-meaning">
                        <span>
                          Meaning
                          {currentReviewPos ? <em>{currentReviewPos}</em> : null}
                        </span>
                        <p>{getReviewQuestionMeaning(currentReviewQuestion)}</p>
                      </div>
                      <div className="vocab-review-sound-options">
                        {currentReviewMetadataOptions.map((option, index) => (
                          <button
                            aria-label={`Play sound option ${index + 1}`}
                            className={reviewAnswer === option.key ? "vocab-review-sound-option--active" : ""}
                            disabled={Boolean(reviewAttemptResult)}
                            key={`meaning-sound-${option.key}`}
                            onClick={() => {
                              setReviewAnswer(option.key);
                              playReviewSoundUrl(option.value, true);
                            }}
                            type="button"
                          >
                            <HomeIcon name="volume" size={22} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_SENTENCE_TO_MEANING" ? (
                    <div className="vocab-review-question">
                      <p className="vocab-review-prompt">
                        {renderReviewSentence(
                          currentReviewQuestion.sentence ??
                            currentReviewQuestion.example?.sentence ??
                            "Choose the sentence meaning."
                        )}
                      </p>
                      <div className="vocab-review-options">
                        {currentReviewMetadataOptions.map((option) => (
                          <button
                            className={reviewAnswer === option.key ? "vocab-review-options__active" : ""}
                            disabled={Boolean(reviewAttemptResult)}
                            key={`sentence-meaning-${option.key}`}
                            onClick={() => setReviewAnswer(option.key)}
                            type="button"
                          >
                            {option.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_SENTENCE_BLANK_TO_SOUND" ? (
                    <div className="vocab-review-question">
                      <p className="vocab-review-prompt">
                        {renderReviewSentence(
                          currentReviewQuestion.sentence ??
                            currentReviewQuestion.example?.sentence ??
                            "Choose the missing sound."
                        )}
                      </p>
                      <div className="vocab-review-sound-options">
                        {currentReviewMetadataOptions.map((option, index) => (
                          <button
                            aria-label={`Play sound option ${index + 1}`}
                            className={reviewAnswer === option.key ? "vocab-review-sound-option--active" : ""}
                            disabled={Boolean(reviewAttemptResult)}
                            key={`sentence-sound-${option.key}`}
                            onClick={() => {
                              setReviewAnswer(option.key);
                              playReviewSoundUrl(option.value, true);
                            }}
                            type="button"
                          >
                            <HomeIcon name="volume" size={22} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_LISTEN_AND_TYPE_WORD" ? (
                    <div className="vocab-review-question">
                      <button aria-label="Play audio" className="vocab-review-audio" onClick={playReviewAudio} type="button">
                        <HomeIcon name="volume" size={20} />
                      </button>
                      <input
                        disabled={Boolean(reviewAttemptResult)}
                        onChange={(event) => setReviewAnswer(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            submitCurrentReviewAnswer();
                          }
                        }}
                        placeholder="Type what you hear"
                        value={reviewAnswer}
                      />
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_CHOOSE_WORD_IN_SENTENCE_BLANK" ? (
                    <div className="vocab-review-question">
                      <p className="vocab-review-prompt">
                        {renderReviewSentence(currentReviewQuestion.sentence ?? "Choose the missing word.")}
                      </p>
                      {currentReviewSentenceMeaning ? (
                        <div className="vocab-review-meaning-reveal">
                          <button
                            aria-expanded={isReviewSentenceMeaningOpen}
                            onClick={() => setIsReviewSentenceMeaningOpen((current) => !current)}
                            type="button"
                          >
                            {isReviewSentenceMeaningOpen ? "Hide meaning" : "View meaning"}
                          </button>
                          {isReviewSentenceMeaningOpen ? <p>{currentReviewSentenceMeaning}</p> : null}
                        </div>
                      ) : null}
                      <div className="vocab-review-options">
                        {(currentReviewQuestion.listAnswers ?? []).map((answer) => (
                          <button
                            className={reviewAnswer === answer ? "vocab-review-options__active" : ""}
                            disabled={Boolean(reviewAttemptResult)}
                            key={answer}
                            onClick={() => setReviewAnswer(answer)}
                            type="button"
                          >
                            {answer}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentReviewType === "VOCAB_FILL_WORD_IN_SENTENCE_BLANK" ? (
                    <div className="vocab-review-question">
                      <InlineReviewAnswer
                        ariaLabel="Missing word in sentence"
                        correctAnswer={currentReviewQuestion.correctAnswer}
                        disabled={Boolean(reviewAttemptResult)}
                        maskedWord={currentReviewQuestion.maskedWord}
                        onChange={setReviewAnswer}
                        onSubmit={submitCurrentReviewAnswer}
                        text={getReviewSentenceFillText(currentReviewQuestion)}
                        value={reviewAnswer}
                      />
                      {currentReviewSentenceMeaning ? (
                        <div className="vocab-review-meaning-reveal">
                          <button
                            aria-expanded={isReviewSentenceMeaningOpen}
                            onClick={() => setIsReviewSentenceMeaningOpen((current) => !current)}
                            type="button"
                          >
                            {isReviewSentenceMeaningOpen ? "Hide meaning" : "View meaning"}
                          </button>
                          {isReviewSentenceMeaningOpen ? <p>{currentReviewSentenceMeaning}</p> : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="vocab-review-attempt__actions">
                    <button
                      disabled={!canSubmitReviewAnswer}
                      onClick={submitCurrentReviewAnswer}
                      type="button"
                    >
                      {submitReviewAttempt.isPending ? "Submitting..." : "Submit attempt"}
                    </button>
                  </div>
                </article>
              ) : null}

              {isReviewSessionComplete ? (
                <div className="vocab-review-empty vocab-review-empty--complete">
                  <HomeIcon name="check" size={30} />
                  <p>Review session completed.</p>
                </div>
              ) : null}

              {shouldShowReviewSummaryPopup ? (
                <div className="vocab-review-result-backdrop" role="presentation">
                  <section
                    aria-modal="true"
                    className="vocab-review-summary-popup"
                    role="dialog"
                  >
                    <div className="vocab-review-summary-popup__header">
                      <span>
                        <HomeIcon name="check" size={24} />
                      </span>
                      <div>
                        <h3>Review summary</h3>
                        <p>{reviewSummaryItems.correct.length} correct / {reviewSummaryItems.wrong.length} wrong</p>
                      </div>
                    </div>
                    <div className="vocab-review-summary-popup__columns">
                      <section className="vocab-review-summary-list vocab-review-summary-list--wrong">
                        <h4>Wrong words</h4>
                        {reviewSummaryItems.wrong.length > 0 ? (
                          <div>
                            {reviewSummaryItems.wrong.map((item, index) => (
                              <article key={`${item.key}-wrong-${index}`}>
                                <strong>{item.word}</strong>
                                <span>{item.pos}</span>
                                <p>{item.meaning}</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="vocab-review-summary-list__empty">No wrong words.</p>
                        )}
                      </section>
                      <section className="vocab-review-summary-list vocab-review-summary-list--correct">
                        <h4>Correct words</h4>
                        {reviewSummaryItems.correct.length > 0 ? (
                          <div>
                            {reviewSummaryItems.correct.map((item, index) => (
                              <article key={`${item.key}-correct-${index}`}>
                                <strong>{item.word}</strong>
                                <span>{item.pos}</span>
                                <p>{item.meaning}</p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="vocab-review-summary-list__empty">No correct words yet.</p>
                        )}
                      </section>
                    </div>
                    <button className="vocab-review-summary-popup__exit" onClick={exitReviewSession} type="button">
                      Exit review
                    </button>
                  </section>
                </div>
              ) : null}

              {reviewResultPopup ? (
                <div className="vocab-review-result-backdrop" role="presentation">
                  <section
                    aria-modal="true"
                    className={`vocab-review-result-popup ${
                      reviewResultPopup.attempt.correct
                        ? "vocab-review-result-popup--correct"
                        : "vocab-review-result-popup--wrong"
                    }`}
                    role="dialog"
                  >
                    <div className="vocab-review-result-popup__top">
                      <span className={reviewResultPopup.attempt.correct ? "is-correct" : "is-wrong"}>
                        {reviewResultPopup.attempt.correct ? <HomeIcon name="check" size={20} /> : <HomeIcon name="close" size={20} />}
                      </span>
                      <button
                        aria-label="Close result"
                        onClick={closeReviewResultPopup}
                        type="button"
                      >
                        <HomeIcon name="close" size={18} />
                      </button>
                    </div>
                    <div className="vocab-review-result-popup__word">
                      <small>{reviewResultPopup.attempt.correct ? "Correct" : "Not quite"}</small>
                      <div className="vocab-review-result-popup__word-row">
                        {reviewResultSoundUrl ? (
                          <button
                            aria-label="Play word sound"
                            className="vocab-review-result-popup__sound"
                            onClick={() => playReviewSoundUrl(reviewResultSoundUrl)}
                            type="button"
                          >
                            <HomeIcon name="volume" size={24} />
                          </button>
                        ) : null}
                        <div>
                          <h3>
                            {reviewResultWord ?? "Review word"}
                            {reviewResultPos ? <span>{reviewResultPos}</span> : null}
                          </h3>
                          {reviewResultIpa ? <p>{reviewResultIpa}</p> : null}
                        </div>
                      </div>
                    </div>
                    <div className="vocab-review-result-popup__meaning">
                      <span>Meaning</span>
                      {reviewResultPrimaryMeaning ? <p>{reviewResultPrimaryMeaning}</p> : null}
                      {!reviewResultMeaningPresentation?.hasAnyMeaning ? <p>No meaning was returned.</p> : null}
                      {canToggleReviewEnglishMeaning ? (
                        <button
                          aria-expanded={isReviewEnglishMeaningOpen}
                          onClick={() => setIsReviewEnglishMeaningOpen((current) => !current)}
                          type="button"
                        >
                          <HomeIcon name="chevron" size={16} />
                          {isReviewEnglishMeaningOpen ? "Hide English meaning" : "English meaning"}
                        </button>
                      ) : null}
                      {isReviewEnglishMeaningOpen && reviewResultEnglishMeaning ? <em>{reviewResultEnglishMeaning}</em> : null}
                    </div>
                    {reviewResultExample ? (
                      <div className="vocab-review-result-popup__example">
                        <span>{isReviewResultSentenceQuestion ? "Completed sentence" : "Example"}</span>
                        <p>
                          {getPlainReviewSentence(reviewResultExample)}
                          {reviewResultExampleTrans ? (
                            <button
                              aria-label="Show example meaning"
                              onClick={() => setIsReviewExampleTransOpen((current) => !current)}
                              type="button"
                            >
                              <HomeIcon name="chevron" size={15} />
                            </button>
                          ) : null}
                        </p>
                        {isReviewExampleTransOpen && reviewResultExampleTrans ? <em>{reviewResultExampleTrans}</em> : null}
                        {isReviewResultSentenceQuestion && hasDifferentReviewResultExtraExample ? (
                          <button
                            className="vocab-review-result-popup__more-example"
                            onClick={() => setIsReviewMoreExampleOpen((current) => !current)}
                            type="button"
                          >
                            <HomeIcon name="chevron" size={16} />
                            {isReviewMoreExampleOpen ? "Hide another example" : "Show another example"}
                          </button>
                        ) : null}
                        {isReviewMoreExampleOpen && reviewResultExtraExample ? (
                          <div className="vocab-review-result-popup__extra-example">
                            <span>Another example</span>
                            <p>{getPlainReviewSentence(reviewResultExtraExample)}</p>
                            {reviewResultExtraExampleTrans ? <em>{reviewResultExtraExampleTrans}</em> : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      className="vocab-review-result-popup__close"
                      onClick={closeReviewResultPopup}
                      type="button"
                    >
                      Continue
                    </button>
                  </section>
                </div>
              ) : null}

              {isReviewExitConfirmOpen ? (
                <div className="vocab-review-result-backdrop" role="presentation">
                  <section aria-modal="true" className="vocab-review-exit-popup" role="dialog">
                    <span>
                      <HomeIcon name="quiz" size={24} />
                    </span>
                    <h3>Exit review?</h3>
                    <p>Your current quiz progress will be cleared and you will return to My Vocabulary.</p>
                    <div>
                      <button onClick={() => setIsReviewExitConfirmOpen(false)} type="button">
                        Keep reviewing
                      </button>
                      <button onClick={exitReviewSession} type="button">
                        Exit review
                      </button>
                    </div>
                  </section>
                </div>
              ) : null}

              {isReviewZeroGeneratedOpen ? (
                <div className="vocab-review-result-backdrop" role="presentation">
                  <section aria-modal="true" className="vocab-review-zero-popup" role="dialog">
                    <span>
                      <HomeIcon name="bookmark" size={24} />
                    </span>
                    <h3>0 review questions generated.</h3>
                    <button onClick={() => setIsReviewZeroGeneratedOpen(false)} type="button">
                      Close
                    </button>
                  </section>
                </div>
              ) : null}

              {reviewQuestions.length === 0 && !review.isPending && !isReviewStandaloneVisible ? (
                <div className="vocab-review-empty">
                  <HomeIcon name="bookmark" size={30} />
                  <p>Start a session to load generated review attempts.</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};
