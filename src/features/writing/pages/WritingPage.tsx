import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { ROUTES } from "../../../shared/constants/routes";
import { useAuth } from "../../auth/hooks/useAuth";
import { HomeIcon } from "../../home/components/HomeIcon";
import { LearningRouteChrome } from "../../home/components/LearningRouteChrome";
import { writingApi } from "../api/writingApi";
import {
  IeltsWritingAttemptHistoryResponse,
  IeltsWritingAttemptHistoryPageResponse,
  IeltsWritingExercise,
  IeltsWritingReference,
  WritingTaskType
} from "../types";

const getTaskLabel = (taskType: WritingTaskType) => `IELTS Writing Task ${taskType}`;
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const getMinWords = (taskType: WritingTaskType) => (taskType === 1 ? 150 : 250);
const getDuration = (taskType: WritingTaskType) => (taskType === 1 ? 20 * 60 : 40 * 60);
const formatTime = (value: number) => {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const stripJsonFence = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const repairPossiblyTruncatedJson = (value: string) => {
  const stack: string[] = [];
  let repaired = "";
  let isInString = false;
  let isEscaped = false;

  for (const character of value) {
    repaired += character;

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (isInString) {
      if (character === "\\") {
        isEscaped = true;
      } else if (character === "\"") {
        isInString = false;
      }
      continue;
    }

    if (character === "\"") {
      isInString = true;
    } else if (character === "{") {
      stack.push("}");
    } else if (character === "[") {
      stack.push("]");
    } else if ((character === "}" || character === "]") && stack[stack.length - 1] === character) {
      stack.pop();
    }
  }

  if (isEscaped) {
    repaired = repaired.slice(0, -1);
  }

  if (isInString) {
    repaired += "\"";
  }

  while (stack.length) {
    repaired = repaired.replace(/,\s*$/g, "");
    repaired += stack.pop();
  }

  return repaired;
};

const parseWritingReviewString = (value: string): unknown => {
  const normalized = stripJsonFence(value);

  try {
    return JSON.parse(normalized);
  } catch {
    try {
      return JSON.parse(repairPossiblyTruncatedJson(normalized));
    } catch {
      return normalized;
    }
  }
};

const parseWritingReview = (value?: unknown): unknown => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    if (isReviewRecord(value) && "result" in value) {
      return parseWritingReview(value.result);
    }

    return value;
  }

  const parsed = parseWritingReviewString(value);
  return isReviewRecord(parsed) && "result" in parsed ? parseWritingReview(parsed.result) : parsed;
};

const isReviewRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const formatReviewLabel = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const getReviewNumber = (record: Record<string, unknown>, key: string): number | null => {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getReviewString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getReviewStringArray = (record: Record<string, unknown>, key: string): string[] => {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
};

type WritingReviewDisplayItem = {
  body: string | null;
  details: Array<{ label: string; value: unknown }>;
  title: string | null;
};

const REVIEW_PRIMARY_FIELDS = new Set(["comment", "problem", "advice", "summary"]);
const REVIEW_TITLE_FIELDS = new Set(["criterion", "title", "name"]);
const REVIEW_FIELD_LABELS: Record<string, string> = {
  corrected_example: "Corrected example",
  evidence: "Evidence",
  explanation_vi: "Explanation",
  frequency: "Frequency",
  grammar_error_detail: "Grammar detail",
  how_to_improve: "How to improve",
  impact: "Impact",
  original: "Original",
  corrected: "Corrected",
  practice_recommendation: "Practice",
  why_reduces_score: "Why it lowers your score"
};

const stringifyReviewText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
};

const getReviewDisplayItems = (value: unknown): WritingReviewDisplayItem[] => {
  const values = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];

  return values
    .map((item) => {
      const text = stringifyReviewText(item);

      if (text) {
        return { body: text, details: [], title: null };
      }

      if (!isReviewRecord(item)) {
        return null;
      }

      const title = Object.entries(item).find(([key, entry]) => REVIEW_TITLE_FIELDS.has(key) && stringifyReviewText(entry))?.[1];
      const body = Object.entries(item).find(([key, entry]) => REVIEW_PRIMARY_FIELDS.has(key) && stringifyReviewText(entry))?.[1];
      const details = Object.entries(item)
        .filter(([key, entry]) => !REVIEW_TITLE_FIELDS.has(key) && !REVIEW_PRIMARY_FIELDS.has(key) && entry !== null && entry !== undefined && entry !== "")
        .map(([key, entry]) => ({ label: REVIEW_FIELD_LABELS[key] ?? formatReviewLabel(key), value: entry }));

      return {
        body: stringifyReviewText(body),
        details,
        title: stringifyReviewText(title)
      };
    })
    .filter((item): item is WritingReviewDisplayItem => Boolean(item && (item.title || item.body || item.details.length)));
};

const renderWritingReviewInlineValue = (value: unknown): ReactNode => {
  const text = stringifyReviewText(value);

  if (text) {
    return <p>{text}</p>;
  }

  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>{renderWritingReviewInlineValue(item)}</li>
        ))}
      </ul>
    );
  }

  if (isReviewRecord(value)) {
    return (
      <div className="writing-review-summary__detail-grid">
        {Object.entries(value).map(([key, entry]) => (
          <article key={key}>
            <span>{REVIEW_FIELD_LABELS[key] ?? formatReviewLabel(key)}</span>
            {renderWritingReviewInlineValue(entry)}
          </article>
        ))}
      </div>
    );
  }

  return <p>{String(value)}</p>;
};

const renderWritingReviewCards = (items: WritingReviewDisplayItem[]) => (
  <div className="writing-review-summary__cards">
    {items.map((item, index) => (
      <article key={index}>
        {item.title ? <strong>{item.title}</strong> : null}
        {item.body ? <p>{item.body}</p> : null}
        {item.details.length ? (
          <div className="writing-review-summary__details">
            {item.details.map((detail) => (
              <section key={detail.label}>
                <span>{detail.label}</span>
                {renderWritingReviewInlineValue(detail.value)}
              </section>
            ))}
          </div>
        ) : null}
      </article>
    ))}
  </div>
);

const renderIeltsWritingReview = (record: Record<string, unknown>): ReactNode | null => {
  const overallBand = getReviewNumber(record, "overall_band");
  const criterionBands = isReviewRecord(record.criterion_bands) ? record.criterion_bands : null;
  const strengths = getReviewDisplayItems(record.strengths);
  const weaknesses = getReviewDisplayItems(record.weaknesses);
  const improvementAdvice = getReviewDisplayItems(record.improvement_advice);

  if (overallBand === null && !criterionBands && !strengths.length && !weaknesses.length && !improvementAdvice.length) {
    return null;
  }

  return (
    <div className="writing-review-summary">
      {overallBand !== null ? (
        <section className="writing-review-summary__overall">
          <span>Overall band</span>
          <strong>{overallBand}</strong>
        </section>
      ) : null}
      {criterionBands ? (
        <section className="writing-review-summary__criteria">
          {Object.entries(criterionBands).map(([criterion, value]) => (
            <article key={criterion}>
              <span>{criterion}</span>
              <strong>{typeof value === "number" ? value : String(value)}</strong>
            </article>
          ))}
        </section>
      ) : null}
      <div className="writing-review-summary__columns">
        {strengths.length ? (
          <section className="writing-review-summary__section writing-review-summary__section--strength">
            <h3>Strengths</h3>
            {renderWritingReviewCards(strengths)}
          </section>
        ) : null}
        {weaknesses.length ? (
          <section className="writing-review-summary__section writing-review-summary__section--weakness">
            <h3>Weaknesses</h3>
            {renderWritingReviewCards(weaknesses)}
          </section>
        ) : null}
      </div>
      {improvementAdvice.length ? (
        <section className="writing-review-summary__advice">
          <h3>Improvement advice</h3>
          {renderWritingReviewCards(improvementAdvice)}
        </section>
      ) : null}
    </div>
  );
};

const renderWritingReviewValue = (value: unknown): ReactNode => {
  if (value === null || value === undefined || value === "") {
    return <p className="writing-review-popup__muted">No detail provided.</p>;
  }

  if (Array.isArray(value)) {
    return (
      <ul className="writing-review-popup__list">
        {value.map((item, index) => (
          <li key={index}>{renderWritingReviewValue(item)}</li>
        ))}
      </ul>
    );
  }

  if (isReviewRecord(value)) {
    const ieltsReview = renderIeltsWritingReview(value);

    if (ieltsReview) {
      return ieltsReview;
    }

    return (
      <div className="writing-review-popup__nested">
        {Object.entries(value).map(([key, item]) => (
          <section key={key}>
            <strong>{formatReviewLabel(key)}</strong>
            {renderWritingReviewValue(item)}
          </section>
        ))}
      </div>
    );
  }

  return <p>{String(value)}</p>;
};

const getReferenceEssayText = (reference?: IeltsWritingReference | null) =>
  reference?.essay?.trim() || "No essay content was returned for this reference.";

const getAttemptCreatedAt = (attempt?: IeltsWritingAttemptHistoryResponse | null) =>
  attempt?.createdAt ?? attempt?.created_at ?? null;

const getAttemptAnswer = (attempt?: IeltsWritingAttemptHistoryResponse | null) =>
  attempt?.userAnswer?.trim() || attempt?.user_answer?.trim() || "No answer was returned for this attempt.";

const getAttemptReview = (attempt?: IeltsWritingAttemptHistoryResponse | null) =>
  attempt?.review?.trim() || "";

const formatAttemptDate = (value?: string | null) => {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

interface WritingRouteState {
  problem?: IeltsWritingExercise | null;
  selectedTopic?: string | null;
  taskType?: WritingTaskType | null;
  topic?: string | null;
}

const getAttemptHistoryItems = (
  value?: IeltsWritingAttemptHistoryResponse[] | IeltsWritingAttemptHistoryPageResponse | null
) => {
  if (Array.isArray(value)) {
    return value;
  }

  return value?.content ?? [];
};

export const WritingExplorePage = () => {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { taskType: taskTypeParam } = useParams();
  const taskType: WritingTaskType = taskTypeParam === "1" ? 1 : 2;
  const routeState = (location.state ?? {}) as WritingRouteState;
  const [selectedTopic, setSelectedTopic] = useState<string | null>(routeState.selectedTopic ?? routeState.topic ?? null);
  const topics = useQuery({
    queryKey: ["writing", "topics", taskType],
    queryFn: () => writingApi.getTopics(taskType)
  });
  const problems = useQuery({
    enabled: Boolean(selectedTopic),
    queryKey: ["writing", "problems", selectedTopic, auth.userId],
    queryFn: () => writingApi.getProblems(selectedTopic as string, auth.userId)
  });
  return (
    <LearningRouteChrome compactTitle={selectedTopic ?? getTaskLabel(taskType)}>
      <section className="vocab-route-page vocab-route-page--nav-compact writing-route-page">
        <section className="writing-route-panel">
          {!selectedTopic ? (
            <div className="writing-topic-grid">
              {topics.isLoading ? <PageLoading label="Loading writing topics..." /> : null}
              {topics.isError ? <ErrorState error={topics.error} title="Could not load writing topics" /> : null}
              {(topics.data ?? []).map((topic) => (
                <button key={topic} onClick={() => setSelectedTopic(topic)} type="button">
                  <span><HomeIcon name="pen" size={22} /></span>
                  <strong>{topic}</strong>
                  <HomeIcon name="chevron" size={18} />
                </button>
              ))}
              {!topics.isLoading && !topics.isError && !(topics.data ?? []).length ? (
                <EmptyState description="No writing topics were returned." />
              ) : null}
            </div>
          ) : (
            <section className="writing-problem-panel">
              <button className="writing-back-button" onClick={() => setSelectedTopic(null)} type="button">
                <HomeIcon name="chevron" size={17} /> Back
              </button>
              {problems.isLoading ? <PageLoading label="Loading writing problems..." /> : null}
              {problems.isError ? <ErrorState error={problems.error} title="Could not load writing problems" /> : null}
              <div className="writing-problem-list">
                {(problems.data ?? []).map((problem, index) => (
                  <button
                    key={problem.id ?? index}
                    onClick={async () => {
                      if (!problem.id) return;
                      const detail = await writingApi.getProblem(problem.id);
                      navigate(ROUTES.writingProblem(problem.id), { state: { problem: detail, taskType, topic: selectedTopic } });
                    }}
                    type="button"
                  >
                    {problem.isDone ? (
                      <em className="writing-problem-list__done" aria-label="Completed">
                        <HomeIcon name="check" size={16} />
                      </em>
                    ) : null}
                    <strong>Problem {index + 1}</strong>
                    <span>{problem.problem}</span>
                  </button>
                ))}
              </div>
              {!problems.isLoading && !problems.isError && !(problems.data ?? []).length ? (
                <EmptyState description="No writing problems were returned for this topic." />
              ) : null}
            </section>
          )}
        </section>
      </section>
    </LearningRouteChrome>
  );
};

export const WritingPracticePage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { problemId } = useParams();
  const state = (location.state ?? {}) as WritingRouteState;
  const problemQuery = useQuery({
    enabled: Boolean(problemId && !state.problem),
    queryKey: ["writing", "problem", problemId],
    queryFn: () => writingApi.getProblem(problemId as string)
  });
  const problem = state.problem ?? problemQuery.data ?? null;
  const taskType: WritingTaskType = (state.taskType ?? (problem?.taskType === 1 ? 1 : 2)) as WritingTaskType;
  const [answer, setAnswer] = useState("");
  const [useTimer, setUseTimer] = useState(false);
  const [remaining, setRemaining] = useState(getDuration(taskType));
  const [isFinished, setIsFinished] = useState(false);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isReviewPopupOpen, setIsReviewPopupOpen] = useState(false);
  const [isHistoryPopupOpen, setIsHistoryPopupOpen] = useState(false);
  const [isHistoryListCollapsed, setIsHistoryListCollapsed] = useState(false);
  const [isReferencePanelOpen, setIsReferencePanelOpen] = useState(false);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);
  const [selectedReferenceBand, setSelectedReferenceBand] = useState<string | null>(null);
  const [selectedReferenceIndex, setSelectedReferenceIndex] = useState<number | null>(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const referenceEssayRef = useRef<HTMLElement | null>(null);
  const wordCount = useMemo(() => countWords(answer), [answer]);
  const minWords = getMinWords(taskType);
  const reviewWriting = useMutation({
    mutationFn: writingApi.review
  });
  const referenceBands = useQuery({
    enabled: Boolean(isReviewPopupOpen && isReferencePanelOpen && problem?.id),
    queryKey: ["writing", "references", "bands", problem?.id],
    queryFn: () => writingApi.getBands(problem?.id as string)
  });
  const references = useQuery({
    enabled: Boolean(isReviewPopupOpen && isReferencePanelOpen && problem?.id && selectedReferenceBand),
    queryKey: ["writing", "references", problem?.id, selectedReferenceBand],
    queryFn: () => writingApi.getReferences(problem?.id as string, selectedReferenceBand as string)
  });
  const attemptHistory = useQuery({
    enabled: Boolean(isHistoryPopupOpen && auth.userId && problem?.id),
    queryKey: ["writing", "attempt-history", auth.userId, problem?.id],
    queryFn: () =>
      writingApi.getAttemptHistory({
        exerciseId: problem?.id as string,
        userId: auth.userId as string
      })
  });

  useEffect(() => {
    setRemaining(getDuration(taskType));
  }, [taskType]);

  useEffect(() => {
    if (selectedReferenceIndex === null) {
      return;
    }

    window.requestAnimationFrame(() => {
      referenceEssayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedReferenceIndex]);

  const exitToList = () =>
    navigate(ROUTES.writingTask(String(taskType)), {
      state: { selectedTopic: problem?.problemTopic ?? state.topic ?? null }
    });
  const historyItems = getAttemptHistoryItems(attemptHistory.data);
  const selectedHistoryAttempt = selectedHistoryIndex === null ? null : historyItems[selectedHistoryIndex] ?? null;
  const submitWritingReview = useCallback(
    (force = false) => {
      if ((!force && wordCount < minWords) || reviewWriting.isPending) {
        return;
      }

      setIsFinished(true);
      setIsReviewPopupOpen(true);
      setIsReferencePanelOpen(false);
      setSelectedReferenceBand(null);
      setSelectedReferenceIndex(null);
      setReviewErrorMessage(null);
      reviewWriting.reset();

      if (!problem?.id) {
        setReviewErrorMessage("Writing problem is not ready.");
        return;
      }

      if (!auth.userId) {
        setReviewErrorMessage("Please sign in to review your writing.");
        return;
      }

      const normalizedAnswer = answer.trim();

      if (!normalizedAnswer) {
        setReviewErrorMessage("Please write your answer before submitting.");
        return;
      }

      reviewWriting.mutate({
        exerciseId: problem.id,
        userId: auth.userId,
        userAnswer: normalizedAnswer
      });
    },
    [answer, auth.userId, minWords, problem?.id, reviewWriting, wordCount]
  );

  useEffect(() => {
    if (!useTimer || isFinished) return undefined;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => submitWritingReview(true), 0);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isFinished, submitWritingReview, useTimer]);

  return (
    <main className="writing-focus-screen">
      <section className="writing-focus-panel">
        <header className="writing-focus-header">
          <button onClick={exitToList} type="button"><HomeIcon name="close" size={18} /> Exit</button>
          <div>
            <h1>{problem?.problemTopic ?? state.topic ?? "Writing practice"}</h1>
          </div>
          <div className="writing-focus-header__actions">
            {useTimer ? <strong>{formatTime(remaining)}</strong> : null}
            <button
              disabled={!auth.userId || !problem?.id}
              onClick={() => {
                setSelectedHistoryIndex(null);
                setIsHistoryListCollapsed(false);
                setIsHistoryPopupOpen(true);
              }}
              type="button"
            >
              History
            </button>
          </div>
        </header>
        {problemQuery.isLoading ? <PageLoading label="Loading problem..." /> : null}
        {problemQuery.isError ? <ErrorState error={problemQuery.error} title="Could not load writing problem" /> : null}
        {problem ? (
          <>
            <article className="writing-problem-card">
              <p>{problem.problem}</p>
              {problem.imageUrl ? (
                <button
                  aria-label="Zoom writing task image"
                  className="writing-problem-card__image"
                  onClick={() => {
                    setImageZoom(1);
                    setIsImagePopupOpen(true);
                  }}
                  type="button"
                >
                  <img alt="Writing task visual" src={problem.imageUrl} />
                </button>
              ) : null}
            </article>
            <section className="writing-answer-card">
              <div className="writing-answer-card__toolbar">
                <span>{wordCount} words / minimum {minWords}</span>
                <label><input checked={useTimer} onChange={(event) => setUseTimer(event.target.checked)} type="checkbox" /> Set timer</label>
              </div>
              <textarea
                disabled={isFinished || reviewWriting.isPending}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Write your answer here..."
                value={answer}
              />
              <button
                disabled={wordCount < minWords || reviewWriting.isPending}
                onClick={() => submitWritingReview(false)}
                type="button"
              >
                Submit
              </button>
            </section>
          </>
        ) : null}
        {isImagePopupOpen && problem?.imageUrl ? (
          <div className="writing-finish-backdrop" role="presentation">
            <section aria-modal="true" className="writing-image-popup" role="dialog">
              <button
                aria-label="Close image preview"
                className="writing-image-popup__close"
                onClick={() => setIsImagePopupOpen(false)}
                type="button"
              >
                <HomeIcon name="close" size={18} />
              </button>
              <div className="writing-image-popup__controls">
                <button
                  aria-label="Zoom out"
                  disabled={imageZoom <= 1}
                  onClick={() => setImageZoom((current) => Math.max(1, Number((current - 0.25).toFixed(2))))}
                  type="button"
                >
                  -
                </button>
                <strong>{Math.round(imageZoom * 100)}%</strong>
                <button
                  aria-label="Zoom in"
                  disabled={imageZoom >= 2.5}
                  onClick={() => setImageZoom((current) => Math.min(2.5, Number((current + 0.25).toFixed(2))))}
                  type="button"
                >
                  +
                </button>
                <button onClick={() => setImageZoom(1)} type="button">Reset</button>
              </div>
              <div className="writing-image-popup__viewport">
                <img
                  alt="Writing task visual preview"
                  src={problem.imageUrl}
                  style={{ width: `${imageZoom * 100}%` }}
                />
              </div>
            </section>
          </div>
        ) : null}
        {isHistoryPopupOpen ? (
          <div className="writing-finish-backdrop" role="presentation">
            <section aria-modal="true" className="writing-history-popup" role="dialog">
              <button
                aria-label="Close writing history"
                className="writing-history-popup__close"
                onClick={() => {
                  setIsHistoryPopupOpen(false);
                  setIsHistoryListCollapsed(false);
                }}
                type="button"
              >
                <HomeIcon name="close" size={18} />
              </button>
              <header>
                <span>Writing history</span>
                <h2>{problem?.problemTopic ?? state.topic ?? "Writing practice"}</h2>
              </header>
              {!auth.userId ? <EmptyState description="Sign in to view writing history." /> : null}
              {auth.userId && attemptHistory.isLoading ? <PageLoading label="Loading writing history..." /> : null}
              {auth.userId && attemptHistory.isError ? (
                <ErrorState error={attemptHistory.error} title="Could not load writing history" />
              ) : null}
              {auth.userId && !attemptHistory.isLoading && !attemptHistory.isError ? (
                <div
                  className={`writing-history-popup__layout ${
                    isHistoryListCollapsed && selectedHistoryAttempt ? "writing-history-popup__layout--collapsed" : ""
                  }`}
                >
                  <aside className="writing-history-popup__list">
                    {isHistoryListCollapsed && selectedHistoryAttempt ? (
                      <button
                        className="writing-history-popup__rail-button"
                        onClick={() => setIsHistoryListCollapsed(false)}
                        type="button"
                      >
                        <HomeIcon name="chevron" size={18} />
                        <span>History</span>
                      </button>
                    ) : (
                      <>
                        {selectedHistoryAttempt ? (
                          <button
                            className="writing-history-popup__collapse-button"
                            onClick={() => setIsHistoryListCollapsed(true)}
                            type="button"
                          >
                            <HomeIcon name="chevron" size={16} /> Collapse
                          </button>
                        ) : null}
                        {historyItems.map((attempt, index) => (
                          <button
                            className={index === selectedHistoryIndex ? "is-active" : ""}
                            key={attempt.attemptId ?? attempt.attempt_id ?? attempt.id ?? index}
                            onClick={() => {
                              setSelectedHistoryIndex(index);
                              setIsHistoryListCollapsed(true);
                            }}
                            type="button"
                          >
                            <span>{formatAttemptDate(getAttemptCreatedAt(attempt))}</span>
                            <small>Attempt {index + 1}</small>
                          </button>
                        ))}
                        {!historyItems.length ? (
                          <p className="writing-review-popup__muted">No writing history yet.</p>
                        ) : null}
                      </>
                    )}
                  </aside>
                  <section className="writing-history-popup__detail">
                    {selectedHistoryAttempt ? (
                      <>
                        <article>
                          <h3>Your essay</h3>
                          <p>{getAttemptAnswer(selectedHistoryAttempt)}</p>
                        </article>
                        <article>
                          <h3>AI review</h3>
                          <div>
                            {getAttemptReview(selectedHistoryAttempt) ? (
                              renderWritingReviewValue(parseWritingReview(getAttemptReview(selectedHistoryAttempt)))
                            ) : (
                              <p className="writing-review-popup__muted">No AI review was saved for this attempt.</p>
                            )}
                          </div>
                        </article>
                      </>
                    ) : (
                      <EmptyState description="Choose one attempt to view your essay and AI review." />
                    )}
                  </section>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
        {isReviewPopupOpen ? (
          <div className="writing-finish-backdrop" role="presentation">
            <section
              aria-modal="true"
              className={`writing-review-popup ${isReferencePanelOpen ? "writing-review-popup--references" : ""}`}
              role="dialog"
            >
              <button aria-label="Close writing review" onClick={exitToList} type="button">
                <HomeIcon name="close" size={18} />
              </button>
              {isReferencePanelOpen ? (
                <>
                  <div className="writing-review-popup__header writing-review-popup__header--references">
                    <button
                      onClick={() => {
                        setIsReferencePanelOpen(false);
                        setSelectedReferenceBand(null);
                        setSelectedReferenceIndex(null);
                      }}
                      type="button"
                    >
                      <HomeIcon name="chevron" size={17} /> Back
                    </button>
                    <div>
                      <h2>Reference essays</h2>
                      <p>Choose a band, then open an essay to compare with your answer.</p>
                    </div>
                  </div>
                  <section className="writing-reference-panel">
                    {referenceBands.isLoading ? <PageLoading label="Loading bands..." /> : null}
                    {referenceBands.isError ? <ErrorState error={referenceBands.error} title="Could not load reference bands" /> : null}
                    {!referenceBands.isLoading && !referenceBands.isError ? (
                      <div className="writing-reference-panel__bands">
                        {(referenceBands.data ?? []).map((band) => (
                          <button
                            className={band === selectedReferenceBand ? "is-active" : ""}
                            key={band}
                            onClick={() => {
                              setSelectedReferenceBand(band);
                              setSelectedReferenceIndex(null);
                            }}
                            type="button"
                          >
                            Band {band}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {!referenceBands.isLoading && !referenceBands.isError && !(referenceBands.data ?? []).length ? (
                      <p className="writing-review-popup__muted">No reference bands were returned.</p>
                    ) : null}
                    {selectedReferenceBand ? (
                      <div className="writing-reference-panel__essays">
                        {references.isLoading ? <PageLoading label="Loading essays..." /> : null}
                        {references.isError ? <ErrorState error={references.error} title="Could not load reference essays" /> : null}
                        {!references.isLoading && !references.isError ? (
                          <div className="writing-reference-panel__essay-list">
                            {(references.data ?? []).map((reference, index) => (
                              <button
                                className={index === selectedReferenceIndex ? "is-active" : ""}
                                key={reference.id ?? index}
                                onClick={() => setSelectedReferenceIndex(index)}
                                type="button"
                              >
                                Essay {index + 1}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        {!references.isLoading && !references.isError && !(references.data ?? []).length ? (
                          <p className="writing-review-popup__muted">No essays were returned for this band.</p>
                        ) : null}
                        {selectedReferenceIndex !== null ? (
                          <article className="writing-reference-panel__essay-content" ref={referenceEssayRef}>
                            <h4>Essay {selectedReferenceIndex + 1}</h4>
                            <p>{getReferenceEssayText(references.data?.[selectedReferenceIndex])}</p>
                          </article>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                </>
              ) : (
                <>
                  <div className="writing-review-popup__header">
                    <span><HomeIcon name={reviewWriting.isError || reviewErrorMessage ? "close" : "check"} size={23} /></span>
                    <div>
                      <h2>{remaining === 0 && useTimer ? "Time is up" : "Writing review"}</h2>
                      <p>{wordCount} words submitted.</p>
                    </div>
                  </div>
                  {reviewWriting.isPending ? (
                    <div className="writing-review-popup__loading">
                      <i />
                      <strong>Reviewing your essay...</strong>
                      <p>AI feedback can take a little while. Please keep this window open.</p>
                    </div>
                  ) : null}
                  {reviewErrorMessage || reviewWriting.isError ? (
                    <div className="writing-review-popup__error">
                      {reviewErrorMessage ?? "Could not review this writing attempt. Please try again later."}
                    </div>
                  ) : null}
                  {reviewWriting.data ? (
                    <div className="writing-review-popup__content">
                      {renderWritingReviewValue(parseWritingReview(reviewWriting.data))}
                    </div>
                  ) : null}
                  <div className="writing-review-popup__actions">
                    <button onClick={exitToList} type="button">Exit</button>
                    <button
                      disabled={!problem?.id}
                      onClick={() => {
                        setIsReferencePanelOpen(true);
                        setSelectedReferenceBand(null);
                        setSelectedReferenceIndex(null);
                      }}
                      type="button"
                    >
                      More references
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
};
