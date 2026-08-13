import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
  useState
} from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { ROUTES } from "../../../shared/constants/routes";
import { useAuth } from "../../auth/hooks/useAuth";
import { WordResponse, WordSoundResponse } from "../../dictionary/types";
import { HomeIcon } from "../../home/components/HomeIcon";
import { LearningRouteChrome } from "../../home/components/LearningRouteChrome";
import { searchApi } from "../../search/api/searchApi";
import { FloatingVocabularyLookup } from "../../search/components/FloatingVocabularyLookup";
import { IeltsReadingQuestion, IeltsReadingQuestionGroup, IeltsReadingSourceResponse } from "../types";
import { readingApi } from "../api/readingApi";
import {
  useIeltsReadingCategories,
  useIeltsReadingSources,
  useIeltsReadingSourcesByCategory
} from "../hooks/useIeltsReadingSources";

const READING_SOURCE_STORAGE_KEY = "ielts.reading.selectedSource";
const READING_CATEGORY_STORAGE_KEY = "ielts.reading.selectedCategory";
const MOCHI_AUDIO_PREFIX = "https://mochien-server.mochidemy.com/audios/question/";
const READING_WORD_POPUP_WIDTH = 520;
const READING_WORD_POPUP_HEIGHT = 620;
const READING_WORD_TOKEN_PATTERN = /^[A-Za-z]+(?:['â€™][A-Za-z]+)?(?:-[A-Za-z]+)*$/;

interface IeltsReadingDetailRouteState {
  selectedCategory?: string | null;
  source?: IeltsReadingSourceResponse | null;
}

interface IeltsReadingListRouteState {
  selectedCategory?: string | null;
}

type ReadingContentBlock = {
  text: string;
  type: "paragraph" | "section";
};

type ReadingWordPopupStyle = CSSProperties & {
  "--reading-word-arrow-top"?: string;
};

interface ActiveReadingWordPopup {
  side: "left" | "right";
  style: ReadingWordPopupStyle;
  word: string;
}

const saveReadingSource = (source: IeltsReadingSourceResponse) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(READING_SOURCE_STORAGE_KEY, JSON.stringify(source));
};

const saveReadingCategory = (category: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (category) {
    window.sessionStorage.setItem(READING_CATEGORY_STORAGE_KEY, category);
    return;
  }

  window.sessionStorage.removeItem(READING_CATEGORY_STORAGE_KEY);
};

const getStoredReadingCategory = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(READING_CATEGORY_STORAGE_KEY);
};

const getStoredReadingSource = (sourceId?: string | null) => {
  if (typeof window === "undefined" || !sourceId) {
    return null;
  }

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(READING_SOURCE_STORAGE_KEY) ?? "null") as
      | IeltsReadingSourceResponse
      | null;
    return parsed?.id === sourceId ? parsed : null;
  } catch {
    return null;
  }
};

const getReadingContentBlocks = (content?: string | null) =>
  (content ?? "No content was returned for this reading.")
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const getReadingSectionLabel = (line: string) => {
  const cleaned = line
    .trim()
    .replace(/\\([*_])/g, "$1")
    .replace(/^["'â€œâ€â€˜â€™]+|["'â€œâ€â€˜â€™]+$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim()
    .replace(/^["'â€œâ€â€˜â€™]+|["'â€œâ€â€˜â€™]+$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();

  if (/^[A-Z]$/.test(cleaned)) {
    return cleaned;
  }

  const sectionMatch = cleaned.match(/^section\s+(\d+)$/i);
  return sectionMatch ? `Section ${sectionMatch[1]}` : null;
};


const decodeReadingLine = (line: string) =>
  line
    .trim()
    .replace(/\\([*_])/g, "$1")
    .replace(/^["']+|["']+$/g, "")
    .trim();

const cleanReadingParagraph = (line: string) => decodeReadingLine(line).replace(/\*+/g, "").trim();

const formatReadingSectionLabel = (line: string) => {
  const cleaned = decodeReadingLine(line)
    .replace(/^\*+|\*+$/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();

  if (/^[A-Z]$/.test(cleaned)) {
    return cleaned;
  }

  const sectionMatch = cleaned.match(/^section\s+(\d+)$/i);
  return sectionMatch ? `Section ${sectionMatch[1]}` : null;
};

const getReadingBlocksFromLine = (line: string): ReadingContentBlock[] => {
  const decodedLine = decodeReadingLine(line);
  const leadingSectionMatch = decodedLine.match(/^\*{2,}([A-Z]|section\s+\d+)\*{2,}(?=\s|$)(.*)$/i);

  if (leadingSectionMatch) {
    const sectionLabel = formatReadingSectionLabel(leadingSectionMatch[1]);
    const rest = cleanReadingParagraph(leadingSectionMatch[2] ?? "");
    return [
      ...(sectionLabel ? [{ text: sectionLabel, type: "section" as const }] : []),
      ...(rest ? [{ text: rest, type: "paragraph" as const }] : [])
    ];
  }

  const sectionLabel = formatReadingSectionLabel(decodedLine);
  if (sectionLabel) {
    return [{ text: sectionLabel, type: "section" }];
  }

  const paragraph = cleanReadingParagraph(decodedLine);
  return paragraph ? [{ text: paragraph, type: "paragraph" }] : [];
};

const getFormattedReadingContentBlocks = (content?: string | null): ReadingContentBlock[] =>
  (content ?? "No content was returned for this reading.")
    .replace(/\\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => getReadingBlocksFromLine(line));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeReadingLookupWord = (word: string) =>
  word
    .replace(/[â€™]/g, "'")
    .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")
    .toLowerCase();

const buildReadingSoundUrl = (sound?: WordSoundResponse | null) => {
  const rawUrl = sound?.mp3Url || sound?.oggUrl;

  if (!rawUrl) {
    return null;
  }

  return rawUrl.startsWith("https://") || rawUrl.startsWith("http://") ? rawUrl : `${MOCHI_AUDIO_PREFIX}${rawUrl}`;
};

const playReadingWordSound = (sound?: WordSoundResponse | null) => {
  const soundUrl = buildReadingSoundUrl(sound);

  if (!soundUrl) {
    return;
  }

  void new Audio(soundUrl).play();
};

const getReadableWordParts = (text: string) => text.split(/([A-Za-z]+(?:['â€™][A-Za-z]+)?(?:-[A-Za-z]+)*)/g);

const getWordPopupPosition = (rect: DOMRect): ActiveReadingWordPopup => {
  const gap = 14;
  const viewportPadding = 14;
  const hasRightRoom = rect.right + gap + READING_WORD_POPUP_WIDTH <= window.innerWidth - viewportPadding;
  const side: ActiveReadingWordPopup["side"] = hasRightRoom ? "right" : "left";
  const left = hasRightRoom
    ? rect.right + gap
    : clamp(rect.left - READING_WORD_POPUP_WIDTH - gap, viewportPadding, window.innerWidth - READING_WORD_POPUP_WIDTH - viewportPadding);
  const top = clamp(
    rect.top - 28,
    viewportPadding,
    Math.max(viewportPadding, window.innerHeight - READING_WORD_POPUP_HEIGHT - viewportPadding)
  );
  const arrowTop = clamp(rect.top + rect.height / 2 - top, 26, READING_WORD_POPUP_HEIGHT - 26);

  return {
    side,
    style: {
      left,
      top,
      "--reading-word-arrow-top": `${arrowTop}px`
    },
    word: ""
  };
};

const getPrimaryReadingWord = (words?: WordResponse[] | null) =>
  words?.find((word) => word.otherSource?.toUpperCase() === "MOCHI") ?? words?.[0] ?? null;

const getDetailRouteState = (state: unknown): IeltsReadingDetailRouteState => {
  if (!state || typeof state !== "object") {
    return {};
  }

  if ("source" in state || "selectedCategory" in state) {
    return state as IeltsReadingDetailRouteState;
  }

  return { source: state as IeltsReadingSourceResponse };
};

const ReadingCategoryBrowser = ({
  initialSelectedCategory,
  onTitleChange
}: {
  initialSelectedCategory?: string | null;
  onTitleChange: (title: string) => void;
}) => {
  const navigate = useNavigate();
  const categories = useIeltsReadingCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialSelectedCategory ?? null);
  const sources = useIeltsReadingSourcesByCategory(selectedCategory, 0, 30);

  useEffect(() => {
    setSelectedCategory(initialSelectedCategory ?? null);
  }, [initialSelectedCategory]);

  return (
    <div className={`reading-browser ${selectedCategory ? "reading-browser--selected" : ""}`}>
      {categories.isLoading ? <PageLoading label="Loading IELTS categories..." /> : null}
      {categories.isError ? <ErrorState error={categories.error} title="Could not load reading categories" /> : null}
      {categories.data?.length && !selectedCategory ? (
        <div className="reading-category-list" aria-label="IELTS reading categories">
          {categories.data.map((category) => (
            <button
              className={`reading-category-card ${selectedCategory === category ? "reading-category-card--active" : ""}`}
              key={category}
              onClick={() => {
                setSelectedCategory(category);
                saveReadingCategory(category);
                onTitleChange(category);
              }}
              type="button"
            >
              <span>
                <HomeIcon name="reading" size={24} />
              </span>
              <strong>{category}</strong>
              <HomeIcon name="chevron" size={18} />
            </button>
          ))}
        </div>
      ) : null}

      {!categories.isLoading && !categories.isError && !categories.data?.length ? (
        <EmptyState description="No IELTS reading categories were returned." />
      ) : null}

      {selectedCategory ? (
        <section className="reading-source-panel">
          <div className="reading-source-panel__toolbar">
            <button
              onClick={() => {
                setSelectedCategory(null);
                saveReadingCategory(null);
                onTitleChange("IELTS Resource");
              }}
              type="button"
            >
              <HomeIcon name="chevron" size={17} />
              Back
            </button>
          </div>
          {sources.isLoading ? <PageLoading label="Loading reading sources..." /> : null}
          {sources.isError ? <ErrorState error={sources.error} title="Could not load reading sources" /> : null}
          {!sources.isLoading && !sources.isError && !sources.data?.content.length ? (
            <EmptyState description="No reading source was returned for this category." />
          ) : null}
          {sources.data?.content.length ? (
            <div className="reading-source-grid">
              {sources.data.content.map((source, index) => (
                <button
                  className="reading-source-card"
                  key={source.id ?? `${source.title}-${index}`}
                  onClick={() => {
                    saveReadingSource(source);
                    saveReadingCategory(selectedCategory);
                    navigate(ROUTES.readingIeltsSource(source.id ?? String(index)), {
                      state: { selectedCategory, source }
                    });
                  }}
                  type="button"
                >
                  <span>
                    <HomeIcon name="book" size={24} />
                  </span>
                  <div>
                    <strong>{source.title ?? "Untitled reading"}</strong>
                    <small>{source.name ?? selectedCategory}</small>
                  </div>
                  <HomeIcon name="chevron" size={18} />
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export const IeltsReadingPage = () => {
  const location = useLocation();
  const listState = location.state as IeltsReadingListRouteState | null;
  const initialSelectedCategory = listState?.selectedCategory ?? null;
  const [compactTitle, setCompactTitle] = useState(initialSelectedCategory ?? "IELTS Resource");

  useEffect(() => {
    setCompactTitle(initialSelectedCategory ?? "IELTS Resource");
  }, [initialSelectedCategory]);

  return (
    <LearningRouteChrome compactTitle={compactTitle}>
      <section className="vocab-route-page vocab-route-page--nav-compact reading-route-page">
        <section className="reading-route-panel">
          <ReadingCategoryBrowser initialSelectedCategory={initialSelectedCategory} onTitleChange={setCompactTitle} />
        </section>
      </section>
    </LearningRouteChrome>
  );
};

const ReadingWordPopup = ({
  active,
  error,
  isLoading,
  onClose,
  onSenseIndexChange,
  popupRef,
  senseIndex,
  word
}: {
  active: ActiveReadingWordPopup;
  error: unknown;
  isLoading: boolean;
  onClose: () => void;
  onSenseIndexChange: (index: number) => void;
  popupRef: RefObject<HTMLDivElement>;
  senseIndex: number;
  word?: WordResponse | null;
}) => {
  const senses = word?.senses ?? [];
  const safeSenseIndex = senses.length ? Math.min(senseIndex, senses.length - 1) : 0;
  const activeSense = senses[safeSenseIndex] ?? null;
  const firstExample = activeSense?.examples?.[0] ?? null;
  const sound = word?.sounds?.find((item) => buildReadingSoundUrl(item)) ?? word?.sounds?.[0] ?? null;
  const soundText = sound?.ipa || sound?.enpr || "Sound";
  const [showExampleTranslation, setShowExampleTranslation] = useState(false);
  const meaning =
    activeSense?.trans?.shortMeaning ||
    activeSense?.trans?.definition ||
    activeSense?.shortMeaning ||
    activeSense?.definition ||
    "No sense was returned for this word.";

  useEffect(() => {
    setShowExampleTranslation(false);
  }, [safeSenseIndex, word?.wordId]);

  return (
    <aside className="reading-word-popup" data-side={active.side} ref={popupRef} style={active.style}>
      <button aria-label="Close word popup" className="reading-word-popup__close" onClick={onClose} type="button">
        <HomeIcon name="close" size={16} />
      </button>
      <div className="reading-word-popup__header">
        <div>
          <strong>{word?.word ?? active.word}</strong>
          {word?.pos ? <span>{word.pos}</span> : null}
        </div>
        {sound ? (
          <button aria-label="Play pronunciation" onClick={() => playReadingWordSound(sound)} type="button">
            <HomeIcon name="volume" size={22} />
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="reading-word-popup__state">Loading meaning...</div>
      ) : error ? (
        <div className="reading-word-popup__state">{getSafeErrorMessage(error)}</div>
      ) : word ? (
        <>
          <div className="reading-word-popup__sound">
            <HomeIcon name="volume" size={17} />
            <span>{soundText}</span>
          </div>
          <section className="reading-word-popup__sense">
            <p>{meaning}</p>
          </section>
          {firstExample ? (
            <section className="reading-word-popup__example">
              <p>{firstExample.sentence}</p>
              {firstExample.trans ? (
                <div className="reading-word-popup__example-translation">
                  <button
                    aria-label="Show example translation"
                    onClick={() => setShowExampleTranslation((current) => !current)}
                    type="button"
                  >
                    <HomeIcon name="globe" size={17} />
                  </button>
                  {showExampleTranslation ? <span>{firstExample.trans}</span> : null}
                </div>
              ) : null}
            </section>
          ) : null}
          {senses.length > 1 ? (
            <div className="reading-word-popup__pager">
              <button
                aria-label="Previous sense"
                disabled={safeSenseIndex === 0}
                onClick={() => onSenseIndexChange(Math.max(0, safeSenseIndex - 1))}
                type="button"
              >
                <HomeIcon name="chevron" size={18} />
              </button>
              <strong>
                {safeSenseIndex + 1} / {senses.length}
              </strong>
              <button
                aria-label="Next sense"
                disabled={safeSenseIndex >= senses.length - 1}
                onClick={() => onSenseIndexChange(Math.min(senses.length - 1, safeSenseIndex + 1))}
                type="button"
              >
                <HomeIcon name="chevron" size={18} />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="reading-word-popup__state">No dictionary detail was found for this word.</div>
      )}
    </aside>
  );
};


type ReadingQuizAnswer = string | string[];
type ReadingQuizAnswers = Record<string, ReadingQuizAnswer>;
type ReadingQuizMode = "attempt" | "review";

type ReadingChoiceOption = {
  display: string;
  label: string;
  text: string;
  value: string;
};

const asReadingRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const normalizeReadingAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const getReadingQuizGroups = (value: unknown): IeltsReadingQuestionGroup[] => {
  const root = asReadingRecord(value);
  const result = asReadingRecord(root?.result);
  const response = result ?? root;
  const quiz = asReadingRecord(response?.quiz) ?? response;
  const groups = quiz?.question_groups ?? quiz?.questionGroups;

  return Array.isArray(groups) ? (groups as IeltsReadingQuestionGroup[]) : [];
};

const getReadingQuestionType = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { questionType?: string | null; question_type?: string | null };
  return record.question_type ?? record.questionType ?? "";
};

const getReadingGroupId = (group: IeltsReadingQuestionGroup, fallback: number) => {
  const record = group as IeltsReadingQuestionGroup & { groupId?: string | null; group_id?: string | null };
  return record.group_id ?? record.groupId ?? String(fallback);
};

const getReadingGroupInstruction = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { instruction?: string | null };
  return record.instruction ?? "";
};

const getReadingGroupContext = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { context?: string | null };
  return record.context ?? "";
};

const getReadingGroupWordLimit = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { wordLimit?: string | null; word_limit?: string | null };
  const value = (record.word_limit ?? record.wordLimit ?? "").trim();
  const upper = value.toUpperCase();

  if (/THREE|3/.test(upper)) {
    return "NO MORE THAN THREE WORDS";
  }

  if (/TWO|2/.test(upper)) {
    return "NO MORE THAN TWO WORDS";
  }

  return upper || value;
};

const getReadingGroupStart = (group: IeltsReadingQuestionGroup, questions: IeltsReadingQuestion[]) => {
  const record = group as IeltsReadingQuestionGroup & { questionNumberStart?: number | null; question_number_start?: number | null };
  return record.question_number_start ?? record.questionNumberStart ?? questions[0]?.number ?? null;
};

const getReadingGroupEnd = (group: IeltsReadingQuestionGroup, questions: IeltsReadingQuestion[]) => {
  const record = group as IeltsReadingQuestionGroup & { questionNumberEnd?: number | null; question_number_end?: number | null };
  return record.question_number_end ?? record.questionNumberEnd ?? questions[questions.length - 1]?.number ?? null;
};

const getReadingAllowOptionReuse = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { allowOptionReuse?: boolean | null; allow_option_reuse?: boolean | null };
  return Boolean(record.allow_option_reuse ?? record.allowOptionReuse);
};

const getReadingGroupQuestions = (group: IeltsReadingQuestionGroup): IeltsReadingQuestion[] => {
  const record = group as IeltsReadingQuestionGroup & { questionList?: IeltsReadingQuestion[]; question_list?: IeltsReadingQuestion[] };
  const questions = record.questions ?? record.questionList ?? record.question_list;

  return Array.isArray(questions) ? questions : [];
};

const getReadingSharedOptions = (group: IeltsReadingQuestionGroup): unknown[] => {
  const record = group as IeltsReadingQuestionGroup & { sharedOptions?: unknown[]; shared_options?: unknown[] };
  const options = record.shared_options ?? record.sharedOptions;

  return Array.isArray(options) ? options : [];
};

const getReadingSourceParagraphIds = (group: IeltsReadingQuestionGroup): string[] => {
  const record = group as IeltsReadingQuestionGroup & { sourceParagraphIds?: string[]; source_paragraph_ids?: string[] };
  const ids = record.source_paragraph_ids ?? record.sourceParagraphIds;

  return Array.isArray(ids) ? ids : [];
};

const getReadingQuestionId = (question: IeltsReadingQuestion) => {
  const record = question as IeltsReadingQuestion & { questionId?: string | null; question_id?: string | null };
  return record.question_id ?? record.questionId ?? null;
};

const getReadingQuestionKey = (question: IeltsReadingQuestion) =>
  getReadingQuestionId(question) ?? String(getReadingQuestionNumber(question) ?? getReadingQuestionStem(question));

const getReadingQuestionNumber = (question: IeltsReadingQuestion) => question.number ?? null;
const getReadingQuestionStem = (question: IeltsReadingQuestion) => question.stem ?? "";
const getReadingQuestionOptions = (question: IeltsReadingQuestion): unknown[] =>
  Array.isArray(question.options) ? (question.options as unknown[]) : [];
const getReadingQuestionAnswer = (question: IeltsReadingQuestion) =>
  Array.isArray(question.answer) ? question.answer : [];
const getReadingQuestionExplanation = (question: IeltsReadingQuestion) => question.explanation ?? "";
const getReadingQuestionEvidence = (question: IeltsReadingQuestion) => {
  const record = question as IeltsReadingQuestion & { evidenceQuote?: string | null; evidence_quote?: string | null };
  return record.evidence_quote ?? record.evidenceQuote ?? "";
};

const parseReadingChoiceOption = (raw: unknown): ReadingChoiceOption => {
  const record = asReadingRecord(raw);
  if (record) {
    const label = String(record.label ?? record.value ?? record.key ?? "").trim();
    const text = String(record.text ?? record.title ?? record.label ?? "").trim();
    const value = label || text;
    return { display: text && label ? `${label}. ${text}` : value, label: label || value, text: label ? text : "", value };
  }

  const textValue = String(raw ?? "").trim();
  const objectLike = textValue.match(/^\{\s*label\s*=\s*([^,}]+)\s*,\s*text\s*=\s*(.*?)\s*\}$/);
  if (objectLike) {
    const label = objectLike[1].trim();
    const text = objectLike[2].trim();
    return { display: `${label}. ${text}`, label, text, value: label };
  }

  const prefixed = textValue.match(/^([A-Za-z]+|[ivxlcdm]+)[.)]\s+(.+)$/i);
  if (prefixed) {
    const label = prefixed[1].trim();
    const text = prefixed[2].trim();
    return { display: `${label}. ${text}`, label, text, value: label };
  }

  return { display: textValue, label: textValue, text: "", value: textValue };
};

const getReadingChoiceOptions = (options: unknown[]) => options.map(parseReadingChoiceOption).filter((option) => option.value);

const getReadingRequiredSelectionCount = (group: IeltsReadingQuestionGroup, question: IeltsReadingQuestion) => {
  const answerCount = getReadingQuestionAnswer(question).length;
  if (answerCount > 1) return answerCount;

  const instruction = getReadingGroupInstruction(group).toLowerCase();
  if (/three|3/.test(instruction)) return 3;
  if (/two|2/.test(instruction)) return 2;
  return 1;
};

const getReadingQuestionStatus = (question: IeltsReadingQuestion, answers: ReadingQuizAnswers, group?: IeltsReadingQuestionGroup) => {
  const value = answers[getReadingQuestionKey(question)];
  if (Array.isArray(value)) {
    const required = group ? getReadingRequiredSelectionCount(group, question) : 1;
    return value.filter(Boolean).length >= required;
  }
  return typeof value === "string" && value.trim().length > 0;
};

const isReadingQuestionCorrect = (question: IeltsReadingQuestion, value: ReadingQuizAnswer | undefined) => {
  const answers = getReadingQuestionAnswer(question);
  const userAnswers = Array.isArray(value) ? value : value ? [value] : [];
  if (!answers.length || !userAnswers.length || answers.length !== userAnswers.length) return false;
  const expected = answers.map(normalizeReadingAnswer).sort();
  const actual = userAnswers.map(normalizeReadingAnswer).sort();
  return expected.every((answer, index) => answer === actual[index]);
};

const getReadingTypeLabel = (type: string) =>
  ({
    matching_features: "Matching features",
    matching_headings: "Matching headings",
    matching_information: "Matching information",
    multiple_choice_multiple: "Multiple choice",
    multiple_choice_single: "Multiple choice",
    sentence_completion: "Sentence completion",
    short_answer: "Short answer",
    summary_completion: "Summary completion",
    true_false_not_given: "True / False / Not Given",
    yes_no_not_given: "Yes / No / Not Given"
  })[type] ?? "Question group";

const ReadingQuestionNumberBadge = ({ question }: { question: IeltsReadingQuestion }) => (
  <span className="reading-quiz-number">{getReadingQuestionNumber(question) ?? "?"}</span>
);

const ReadingInstructionPanel = ({ group }: { group: IeltsReadingQuestionGroup }) => {
  const instruction = getReadingGroupInstruction(group);
  const wordLimit = getReadingGroupWordLimit(group);
  const allowReuse = getReadingAllowOptionReuse(group);
  const type = getReadingQuestionType(group);

  if (!instruction && !wordLimit && !allowReuse) return null;

  return (
    <div className="reading-quiz-instruction-panel">
      {instruction ? <p>{instruction}</p> : null}
      <div>
        {wordLimit ? <span>{wordLimit}</span> : null}
        {(type.startsWith("matching_") || type === "summary_completion") && !allowReuse ? <small>Options can be used once.</small> : null}
        {allowReuse ? <small>Options may be used more than once.</small> : null}
      </div>
    </div>
  );
};

const ReadingSharedOptionsPanel = ({ options, title, usedValues }: { options: ReadingChoiceOption[]; title: string; usedValues?: Set<string> }) => {
  if (!options.length) return null;

  return (
    <aside className="reading-quiz-shared-panel">
      <strong>{title}</strong>
      <div>
        {options.map((option) => (
          <span className={usedValues?.has(option.value) ? "is-used" : ""} key={option.value}>
            <b>{option.label}</b>
            {option.text ? <em>{option.text}</em> : null}
          </span>
        ))}
      </div>
    </aside>
  );
};

const ReadingReviewFeedback = ({ question, value }: { question: IeltsReadingQuestion; value?: ReadingQuizAnswer }) => {
  const isAnswered = Array.isArray(value) ? value.length > 0 : Boolean(value && value.trim());
  const isCorrect = isReadingQuestionCorrect(question, value);
  const evidence = getReadingQuestionEvidence(question);
  const explanation = getReadingQuestionExplanation(question);

  return (
    <div className={`reading-quiz-feedback ${!isAnswered ? "is-empty" : isCorrect ? "is-correct" : "is-wrong"}`}>
      <p><strong>Your answer:</strong> {Array.isArray(value) ? value.join(", ") : value || "No answer"}</p>
      <p><strong>Correct answer:</strong> {getReadingQuestionAnswer(question).join(", ") || "No answer returned"}</p>
      {evidence ? <blockquote><strong>Evidence</strong>{evidence}</blockquote> : null}
      {explanation ? <p><strong>Explanation:</strong> {explanation}</p> : null}
    </div>
  );
};

const formatReadingDropdownLabel = (option?: ReadingChoiceOption | null) => {
  if (!option) {
    return null;
  }

  return {
    label: option.label.toUpperCase(),
    text: option.text || option.label
  };
};

const ReadingMatchingDropdown = ({
  disabled,
  disabledValues,
  onChange,
  options,
  question,
  value
}: {
  disabled: boolean;
  disabledValues?: Set<string>;
  onChange: (value: string) => void;
  options: ReadingChoiceOption[];
  question: IeltsReadingQuestion;
  value: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const selectedLabel = formatReadingDropdownLabel(selectedOption);

  return (
    <div className={`reading-matching-dropdown ${isOpen ? "is-open" : ""}`} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setIsOpen(false);
      }
    }}>
      <button
        aria-expanded={isOpen}
        aria-label={`Question ${getReadingQuestionNumber(question) ?? ""} answer`}
        className={selectedOption ? "has-value" : ""}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {selectedLabel ? (
          <span><b>{selectedLabel.label}.</b> <em>{selectedLabel.text}</em></span>
        ) : (
          <span className="reading-matching-dropdown__placeholder">?</span>
        )}
      </button>
      <div className="reading-matching-dropdown__menu" role="listbox">
        {options.map((option) => {
          const isDisabled = Boolean(disabledValues?.has(option.value) && option.value !== value);
          const display = formatReadingDropdownLabel(option);
          return (
            <button
              aria-selected={value === option.value}
              disabled={disabled || isDisabled}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(value === option.value ? "" : option.value);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              <b>{display?.label}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ReadingSelectQuestion = ({
  answers,
  disabledValues,
  mode,
  onChange,
  options,
  question
}: {
  answers: ReadingQuizAnswers;
  disabledValues?: Set<string>;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  options: ReadingChoiceOption[];
  question: IeltsReadingQuestion;
}) => {
  const key = getReadingQuestionKey(question);
  const value = typeof answers[key] === "string" ? answers[key] as string : "";

  return (
    <article className="reading-quiz-question reading-quiz-question--matching">
      <div className="reading-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <ReadingMatchingDropdown
        disabled={mode === "review"}
        disabledValues={disabledValues}
        onChange={(nextValue) => onChange(question, nextValue)}
        options={options}
        question={question}
        value={value}
      />
      {mode === "review" ? <ReadingReviewFeedback question={question} value={answers[key]} /> : null}
    </article>
  );
};

const ReadingRadioQuestion = ({
  answers,
  mode,
  onChange,
  options,
  question
}: {
  answers: ReadingQuizAnswers;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  options: ReadingChoiceOption[];
  question: IeltsReadingQuestion;
}) => {
  const key = getReadingQuestionKey(question);
  const value = typeof answers[key] === "string" ? answers[key] as string : "";

  return (
    <article className="reading-quiz-question">
      <div className="reading-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <div className="reading-quiz-options">
        {options.map((option) => (
          <label
            className={value === option.value ? "is-selected" : ""}
            key={option.value}
            onClick={(event) => {
              if (mode === "review") return;
              event.preventDefault();
              onChange(question, value === option.value ? "" : option.value);
            }}
          >
            <input
              checked={value === option.value}
              disabled={mode === "review"}
              name={key}
              onChange={() => undefined}
              type="radio"
            />
            <span>{option.label}</span>
            {option.text ? <em>{option.text}</em> : null}
          </label>
        ))}
      </div>
      {mode === "review" ? <ReadingReviewFeedback question={question} value={answers[key]} /> : null}
    </article>
  );
};

const ReadingSegmentedQuestion = ({
  answers,
  choices,
  mode,
  onChange,
  question
}: {
  answers: ReadingQuizAnswers;
  choices: string[];
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  question: IeltsReadingQuestion;
}) => {
  const options = choices.map((choice) => ({ display: choice, label: choice, text: "", value: choice }));
  return <ReadingRadioQuestion answers={answers} mode={mode} onChange={onChange} options={options} question={question} />;
};

const ReadingCheckboxQuestion = ({
  answers,
  group,
  mode,
  onChange,
  options,
  question
}: {
  answers: ReadingQuizAnswers;
  group: IeltsReadingQuestionGroup;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  options: ReadingChoiceOption[];
  question: IeltsReadingQuestion;
}) => {
  const key = getReadingQuestionKey(question);
  const selected = Array.isArray(answers[key]) ? answers[key] as string[] : [];
  const required = getReadingRequiredSelectionCount(group, question);

  return (
    <article className="reading-quiz-question">
      <div className="reading-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <span className="reading-quiz-selection-count">{selected.length} of {required} selected</span>
      <div className="reading-quiz-options">
        {options.map((option) => (
          <label className={selected.includes(option.value) ? "is-selected" : ""} key={option.value}>
            <input
              checked={selected.includes(option.value)}
              disabled={mode === "review" || (!selected.includes(option.value) && selected.length >= required)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, option.value]
                  : selected.filter((item) => item !== option.value);
                onChange(question, next);
              }}
              type="checkbox"
            />
            <span>{option.label}</span>
            {option.text ? <em>{option.text}</em> : null}
          </label>
        ))}
      </div>
      {mode === "review" ? <ReadingReviewFeedback question={question} value={answers[key]} /> : null}
    </article>
  );
};

const ReadingTextQuestion = ({
  answers,
  group,
  mode,
  onChange,
  question
}: {
  answers: ReadingQuizAnswers;
  group: IeltsReadingQuestionGroup;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  question: IeltsReadingQuestion;
}) => {
  const key = getReadingQuestionKey(question);
  const value = typeof answers[key] === "string" ? answers[key] as string : "";

  return (
    <article className="reading-quiz-question">
      <div className="reading-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <input
        aria-label={`Question ${getReadingQuestionNumber(question) ?? ""}`}
        disabled={mode === "review"}
        onChange={(event) => onChange(question, event.target.value)}
        placeholder={getReadingGroupWordLimit(group) || "Enter your answer"}
        value={value}
      />
      {mode === "review" ? <ReadingReviewFeedback question={question} value={answers[key]} /> : null}
    </article>
  );
};

const ReadingSentenceCompletionQuestion = ({
  answers,
  group,
  mode,
  onChange,
  question
}: {
  answers: ReadingQuizAnswers;
  group: IeltsReadingQuestionGroup;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  question: IeltsReadingQuestion;
}) => {
  const key = getReadingQuestionKey(question);
  const value = typeof answers[key] === "string" ? answers[key] as string : "";
  const parts = getReadingQuestionStem(question).split(/(\{\{Q\d+\}\})/g);

  return (
    <article className="reading-quiz-question reading-quiz-question--sentence">
      <div className="reading-quiz-question__stem reading-quiz-question__stem--inline">
        <ReadingQuestionNumberBadge question={question} />
        <p>
        {parts.map((part, index) =>
          /\{\{Q\d+\}\}/.test(part) ? (
            <span className="reading-quiz-gap" key={`${key}-${index}`}>
              <input
                aria-label={`Question ${getReadingQuestionNumber(question) ?? ""}`}
                disabled={mode === "review"}
                onChange={(event) => onChange(question, event.target.value)}
                value={value}
              />
            </span>
          ) : (
            <span key={`${key}-${index}`}>{part}</span>
          )
        )}
        </p>
      </div>
      {mode === "review" ? <ReadingReviewFeedback question={question} value={answers[key]} /> : null}
    </article>
  );
};

const ReadingSummaryCompletion = ({
  answers,
  group,
  mode,
  onChange,
  options,
  questions,
  usedValues
}: {
  answers: ReadingQuizAnswers;
  group: IeltsReadingQuestionGroup;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  options: ReadingChoiceOption[];
  questions: IeltsReadingQuestion[];
  usedValues: Set<string>;
}) => {
  const allowReuse = getReadingAllowOptionReuse(group);
  const context = getReadingGroupContext(group);

  return (
    <div className="reading-quiz-summary-context">
      {context.split(/(\{\{Q\d+\}\})/g).map((part, index) => {
        const match = part.match(/\{\{Q(\d+)\}\}/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        const question = questions.find((item) => getReadingQuestionNumber(item) === Number(match[1]));
        if (!question) return <span key={part}>{part}</span>;
        const key = getReadingQuestionKey(question);
        const value = typeof answers[key] === "string" ? answers[key] as string : "";
        return (
          <span className="reading-quiz-gap" key={key}>
            <b>{getReadingQuestionNumber(question)}</b>
            {options.length ? (
              <select
                aria-label={`Question ${getReadingQuestionNumber(question) ?? ""}`}
                disabled={mode === "review"}
                onChange={(event) => onChange(question, event.target.value)}
                value={value}
              >
                <option value="">Select</option>
                {options.map((option) => (
                  <option disabled={mode === "attempt" && !allowReuse && usedValues.has(option.value) && option.value !== value} key={option.value} value={option.value}>
                    {option.display}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={`Question ${getReadingQuestionNumber(question) ?? ""}`}
                disabled={mode === "review"}
                onChange={(event) => onChange(question, event.target.value)}
                placeholder={getReadingGroupWordLimit(group) || "Answer"}
                value={value}
              />
            )}
          </span>
        );
      })}
      {mode === "review" ? questions.map((question) => <ReadingReviewFeedback key={getReadingQuestionKey(question)} question={question} value={answers[getReadingQuestionKey(question)]} />) : null}
    </div>
  );
};

const ReadingQuestionRenderer = ({
  answers,
  group,
  mode,
  onChange,
  question,
  selectOptions,
  usedValues
}: {
  answers: ReadingQuizAnswers;
  group: IeltsReadingQuestionGroup;
  mode: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  question: IeltsReadingQuestion;
  selectOptions: ReadingChoiceOption[];
  usedValues: Set<string>;
}) => {
  const type = getReadingQuestionType(group);

  if (type === "matching_features" || type === "matching_headings" || type === "matching_information") {
    return (
      <ReadingSelectQuestion
        answers={answers}
        disabledValues={getReadingAllowOptionReuse(group) ? undefined : usedValues}
        mode={mode}
        onChange={onChange}
        options={selectOptions}
        question={question}
      />
    );
  }

  if (type === "multiple_choice_multiple") {
    return (
      <ReadingCheckboxQuestion
        answers={answers}
        group={group}
        mode={mode}
        onChange={onChange}
        options={getReadingChoiceOptions(getReadingQuestionOptions(question))}
        question={question}
      />
    );
  }

  if (type === "multiple_choice_single") {
    return (
      <ReadingRadioQuestion
        answers={answers}
        mode={mode}
        onChange={onChange}
        options={getReadingChoiceOptions(getReadingQuestionOptions(question))}
        question={question}
      />
    );
  }

  if (type === "true_false_not_given") {
    return <ReadingSegmentedQuestion answers={answers} choices={["TRUE", "FALSE", "NOT GIVEN"]} mode={mode} onChange={onChange} question={question} />;
  }

  if (type === "yes_no_not_given") {
    return <ReadingSegmentedQuestion answers={answers} choices={["YES", "NO", "NOT GIVEN"]} mode={mode} onChange={onChange} question={question} />;
  }

  if (type === "sentence_completion") {
    return <ReadingSentenceCompletionQuestion answers={answers} group={group} mode={mode} onChange={onChange} question={question} />;
  }

  if (type === "short_answer") {
    return <ReadingTextQuestion answers={answers} group={group} mode={mode} onChange={onChange} question={question} />;
  }

  return (
    <article className="reading-quiz-question">
      <p>This question type is not supported yet.</p>
    </article>
  );
};

const ReadingQuizGroup = ({
  answers,
  group,
  mode = "attempt",
  onChange
}: {
  answers: ReadingQuizAnswers;
  group: IeltsReadingQuestionGroup;
  mode?: ReadingQuizMode;
  onChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
}) => {
  const questions = getReadingGroupQuestions(group);
  const type = getReadingQuestionType(group);
  const sharedOptions = getReadingChoiceOptions(getReadingSharedOptions(group));
  const paragraphOptions = getReadingSourceParagraphIds(group).map((value) => ({ display: value, label: value, text: "", value }));
  const selectOptions = type === "matching_information" ? paragraphOptions : sharedOptions;
  const answeredCount = questions.filter((question) => getReadingQuestionStatus(question, answers, group)).length;
  const usedValues = new Set(
    questions
      .map((question) => answers[getReadingQuestionKey(question)])
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
  );
  const context = getReadingGroupContext(group);
  const showSharedOptions = sharedOptions.length > 0 && (type.startsWith("matching_") || type === "summary_completion");
  const sharedTitle = type === "matching_headings" ? "List of Headings" : type === "summary_completion" ? "Word bank" : "Options";

  return (
    <section className={`reading-quiz-group reading-quiz-group--${type || "unknown"}`}>
      <header className="reading-quiz-group__header">
        <div>
          <span>{getReadingTypeLabel(type)}</span>
        </div>
        <small>{answeredCount} of {questions.length} answered</small>
      </header>
      <div className="reading-quiz-progress"><span style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} /></div>
      <ReadingInstructionPanel group={group} />
      {type === "yes_no_not_given" ? <p className="reading-quiz-helper">This question asks about the writer&apos;s views or claims.</p> : null}
      {context && type !== "summary_completion" ? <pre className="reading-quiz-context">{context}</pre> : null}
      <div className={showSharedOptions ? "reading-quiz-workspace" : "reading-quiz-workspace reading-quiz-workspace--single"}>
        {showSharedOptions ? <ReadingSharedOptionsPanel options={sharedOptions} title={sharedTitle} usedValues={usedValues} /> : null}
        <div className="reading-quiz-questions">
          {type === "summary_completion" ? (
            <ReadingSummaryCompletion
              answers={answers}
              group={group}
              mode={mode}
              onChange={onChange}
              options={sharedOptions}
              questions={questions}
              usedValues={usedValues}
            />
          ) : (
            questions.map((question) => (
              <ReadingQuestionRenderer
                answers={answers}
                group={group}
                key={getReadingQuestionKey(question)}
                mode={mode}
                onChange={onChange}
                question={question}
                selectOptions={selectOptions}
                usedValues={usedValues}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

const ReadingQuizResultPopup = ({
  answers,
  contentBlocks,
  groups,
  onClose,
  sourceTitle
}: {
  answers: ReadingQuizAnswers;
  contentBlocks: ReadingContentBlock[];
  groups: IeltsReadingQuestionGroup[];
  onClose: () => void;
  sourceTitle?: string | null;
}) => {
  const [isPassageOpen, setIsPassageOpen] = useState(false);
  const questions = groups.flatMap((group) => getReadingGroupQuestions(group));
  const correctCount = questions.filter((question) => isReadingQuestionCorrect(question, answers[getReadingQuestionKey(question)])).length;
  const hasPassage = contentBlocks.length > 0;

  return (
    <div className="reading-quiz-result-backdrop" role="presentation">
      <section
        aria-modal="true"
        className={`reading-quiz-result-popup ${isPassageOpen ? "reading-quiz-result-popup--with-passage" : ""}`}
        role="dialog"
      >
        <header>
          <div className="reading-quiz-result-summary">
            <span><HomeIcon name="check" size={24} /></span>
            <div>
              <h3>Quiz result</h3>
              <p>{correctCount} / {questions.length} correct</p>
            </div>
          </div>
          {hasPassage ? (
            <button
              className="reading-quiz-result-passage-toggle"
              onClick={() => setIsPassageOpen((current) => !current)}
              type="button"
            >
              <HomeIcon name="reading" size={18} />
              {isPassageOpen ? "Hide passage" : "Show passage"}
            </button>
          ) : null}
        </header>
        <div className={`reading-quiz-result-content ${isPassageOpen ? "reading-quiz-result-content--with-passage" : ""}`}>
          {isPassageOpen ? (
            <article className="reading-quiz-result-passage">
              <h4>{sourceTitle?.trim() || "Reading passage"}</h4>
              <div className="reading-quiz-result-passage__body">
                {contentBlocks.map((block, index) =>
                  block.type === "section" ? (
                    <h5 key={`${block.text}-${index}`}>{block.text}</h5>
                  ) : (
                    <p key={`${block.text.slice(0, 30)}-${index}`}>{block.text}</p>
                  )
                )}
              </div>
            </article>
          ) : null}
          <div className="reading-quiz-result-list reading-quiz-result-list--groups">
            {groups.map((group, index) => (
              <ReadingQuizGroup
                answers={answers}
                group={group}
                key={getReadingGroupId(group, index)}
                mode="review"
                onChange={() => undefined}
              />
            ))}
          </div>
        </div>
        <button onClick={onClose} type="button">Close quiz</button>
      </section>
    </div>
  );
};

export const IeltsReadingDetailPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const readingPanelRef = useRef<HTMLElement>(null);
  const readingContentBodyRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const { sourceId } = useParams();
  const fallbackSources = useIeltsReadingSources(0, 100);
  const routeState = getDetailRouteState(location.state);
  const selectedCategory = routeState.selectedCategory ?? getStoredReadingCategory();
  const storedSource = getStoredReadingSource(sourceId);
  const fetchedSource = fallbackSources.data?.content.find((source) => source.id === sourceId) ?? null;
  const source = routeState.source?.id === sourceId ? routeState.source : storedSource ?? fetchedSource;
  const contentBlocks = getFormattedReadingContentBlocks(source?.content);
  const [activeReadingWord, setActiveReadingWord] = useState<ActiveReadingWordPopup | null>(null);
  const [activeSenseIndex, setActiveSenseIndex] = useState(0);
  const [isReadingQuizOpen, setIsReadingQuizOpen] = useState(false);
  const [hasStartedReadingQuiz, setHasStartedReadingQuiz] = useState(false);
  const [readingQuizAnswers, setReadingQuizAnswers] = useState<ReadingQuizAnswers>({});
  const [isReadingQuizResultOpen, setIsReadingQuizResultOpen] = useState(false);
  const [isReadingQuizExitConfirmOpen, setIsReadingQuizExitConfirmOpen] = useState(false);
  const [readingQuizExitTarget, setReadingQuizExitTarget] = useState<"quiz" | "page">("quiz");
  const readingQuiz = useQuery({
    enabled: Boolean(isReadingQuizOpen && sourceId && auth.userId),
    queryKey: ["reading", "ielts", "quiz", sourceId, auth.userId],
    queryFn: () => readingApi.getIeltsReadingQuiz({ readingId: sourceId as string, userId: auth.userId })
  });
  const lookupReadingWord = useMutation({
    mutationFn: (word: string) => searchApi.fullSearch(word, "vi"),
    onSuccess: () => setActiveSenseIndex(0)
  });
  const popupWord = getPrimaryReadingWord(lookupReadingWord.data);
  const readingQuizGroups = getReadingQuizGroups(readingQuiz.data);

  const handleReadingQuizAnswerChange = (question: IeltsReadingQuestion, value: string | string[]) => {
    setReadingQuizAnswers((current) => ({ ...current, [getReadingQuestionKey(question)]: value }));
  };


  const closeReadingQuiz = () => {
    setIsReadingQuizOpen(false);
    setIsReadingQuizResultOpen(false);
    setIsReadingQuizExitConfirmOpen(false);
    setHasStartedReadingQuiz(false);
    setReadingQuizExitTarget("quiz");
    setReadingQuizAnswers({});
  };

  const requestCloseReadingQuiz = () => {
    if (!isReadingQuizResultOpen) {
      setReadingQuizExitTarget("quiz");
      setIsReadingQuizExitConfirmOpen(true);
      return;
    }

    closeReadingQuiz();
  };

  const goBackToReadingList = () => {
    navigate(ROUTES.readingIelts, { state: { selectedCategory } });
  };

  const requestExitReadingDetail = () => {
    if (hasStartedReadingQuiz && !isReadingQuizResultOpen) {
      setReadingQuizExitTarget("page");
      setIsReadingQuizExitConfirmOpen(true);
      return;
    }

    goBackToReadingList();
  };

  const confirmReadingQuizExit = () => {
    if (readingQuizExitTarget === "page") {
      closeReadingQuiz();
      goBackToReadingList();
      return;
    }

    closeReadingQuiz();
  };

  const closeReadingWordPopup = () => {
    setActiveReadingWord(null);
    lookupReadingWord.reset();
  };

  const handleReadingWordClick = (rawWord: string, target: HTMLElement) => {
    const lookupWord = normalizeReadingLookupWord(rawWord);

    if (!lookupWord) {
      return;
    }

    const popupPosition = getWordPopupPosition(target.getBoundingClientRect());
    setActiveSenseIndex(0);
    setActiveReadingWord({ ...popupPosition, word: lookupWord });
    lookupReadingWord.mutate(lookupWord);
  };

  const renderReadingParagraph = (text: string, blockIndex: number) =>
    getReadableWordParts(text).map((part, partIndex) =>
      READING_WORD_TOKEN_PATTERN.test(part) ? (
        <button
          className="reading-word-token"
          key={`${part}-${blockIndex}-${partIndex}`}
          onClick={(event) => handleReadingWordClick(part, event.currentTarget)}
          type="button"
        >
          {part}
        </button>
      ) : (
        <span key={`${part}-${blockIndex}-${partIndex}`}>{part}</span>
      )
    );
  useEffect(() => {
    if (source) {
      saveReadingSource(source);
    }
  }, [source]);

  useEffect(() => {
    if (!activeReadingWord) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target || popupRef.current?.contains(target) || target.closest(".reading-word-token")) {
        return;
      }

      closeReadingWordPopup();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeReadingWordPopup();
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeReadingWord]);

  return (
    <main className="reading-focus-screen">
      <section className={`reading-focus-panel ${isReadingQuizOpen ? "reading-focus-panel--quiz-open" : ""}`} ref={readingPanelRef}>
        <header className="reading-focus-header reading-focus-header--with-quiz">
          <button onClick={requestExitReadingDetail} type="button">
            <HomeIcon name="close" size={18} />
            Exit
          </button>
          {source ? (
            <h1 className="reading-focus-header__title">{source.title ?? source.name ?? "IELTS Resource"}</h1>
          ) : (
            <span aria-hidden="true" />
          )}
          {source ? (
            <button
              className="reading-header-quiz-button"
              onClick={() => {
                setHasStartedReadingQuiz(true);
                setIsReadingQuizOpen(true);
              }}
              type="button"
            >
              <HomeIcon name="chevron" size={18} />
              Quiz Now
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </header>
        <FloatingVocabularyLookup
          anchorRef={readingContentBodyRef}
          languageCode="vi"
          onRequireAuth={() => undefined}
          userId={auth.userId}
        />

        {!source && fallbackSources.isLoading ? <PageLoading label="Loading reading source..." /> : null}
        {!source && fallbackSources.isError ? (
          <ErrorState error={fallbackSources.error} title="Could not load reading source" />
        ) : null}
        {!source && !fallbackSources.isLoading && !fallbackSources.isError ? (
          <EmptyState description="Open this reading from the IELTS Resource list to view its full content." />
        ) : null}

        {source ? (
          <div className="reading-focus-layout">
            <article className="reading-focus-content">
              <div className="reading-focus-content__body" ref={readingContentBodyRef}>
                {contentBlocks.map((block, index) =>
                  block.type === "section" ? (
                    <h2 className="reading-focus-content__section" key={`${block.text}-${index}`}>
                      {block.text}
                    </h2>
                  ) : (
                    <p key={`${block.text.slice(0, 30)}-${index}`}>{renderReadingParagraph(block.text, index)}</p>
                  )
                )}
              </div>
              <Link
                onClick={(event) => {
                  if (hasStartedReadingQuiz && !isReadingQuizResultOpen) {
                    event.preventDefault();
                    setReadingQuizExitTarget("page");
                    setIsReadingQuizExitConfirmOpen(true);
                  }
                }}
                state={{ selectedCategory }}
                to={ROUTES.readingIelts}
              >
                Back to IELTS Resource
              </Link>
            </article>

            {isReadingQuizOpen ? (
              <aside className="reading-quiz-panel">
                <button aria-label="Close reading quiz" className="reading-quiz-panel__close" onClick={requestCloseReadingQuiz} type="button">
                  <HomeIcon name="close" size={17} />
                </button>
                {!auth.userId ? <EmptyState description="Sign in to load reading quiz." /> : null}
                {auth.userId && readingQuiz.isLoading ? <PageLoading label="Loading reading quiz..." /> : null}
                {auth.userId && readingQuiz.isError ? (
                  <ErrorState error={readingQuiz.error} title="Could not load reading quiz" />
                ) : null}
                {auth.userId && !readingQuiz.isLoading && !readingQuiz.isError && !readingQuizGroups.length ? (
                  <EmptyState description="No quiz questions were returned for this reading." />
                ) : null}
                {readingQuizGroups.length ? (
                  <>
                    <div className="reading-quiz-panel__body">
                      {readingQuizGroups.map((group, index) => (
                        <ReadingQuizGroup
                          answers={readingQuizAnswers}
                          group={group}
                          key={getReadingGroupId(group, index)}
                          onChange={handleReadingQuizAnswerChange}
                        />
                      ))}
                    </div>
                    <button
                      className="reading-quiz-submit"
                      onClick={() => {
                        setIsReadingQuizExitConfirmOpen(false);
                        setIsReadingQuizResultOpen(true);
                      }}
                      type="button"
                    >
                      Submit quiz
                    </button>
                  </>
                ) : null}
              </aside>
            ) : null}
          </div>
        ) : null}
        {isReadingQuizResultOpen ? (
          <ReadingQuizResultPopup
            answers={readingQuizAnswers}
            contentBlocks={contentBlocks}
            groups={readingQuizGroups}
            onClose={closeReadingQuiz}
            sourceTitle={source?.title ?? source?.name ?? "IELTS Resource"}
          />
        ) : null}
        {activeReadingWord ? (
          <ReadingWordPopup
            active={activeReadingWord}
            error={lookupReadingWord.error}
            isLoading={lookupReadingWord.isPending}
            onClose={closeReadingWordPopup}
            onSenseIndexChange={setActiveSenseIndex}
            popupRef={popupRef}
            senseIndex={activeSenseIndex}
            word={popupWord}
          />
        ) : null}
      </section>
      {isReadingQuizExitConfirmOpen ? (
        <div className="reading-quiz-exit-backdrop" role="presentation">
          <section aria-modal="true" className="reading-quiz-exit-popup" role="dialog">
            <span><HomeIcon name="close" size={22} /></span>
            <h3>{readingQuizExitTarget === "page" ? "Exit reading?" : "Exit quiz?"}</h3>
            <p>Your current answers have not been submitted yet.</p>
            <div>
              <button onClick={() => setIsReadingQuizExitConfirmOpen(false)} type="button">Keep doing</button>
              <button onClick={confirmReadingQuizExit} type="button">Exit</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
};

