import { useMemo, useState } from "react";
import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { HomeIcon } from "../../home/components/HomeIcon";
import { countAllVocabularyUnanswered, allVocabularyColumnKeys } from "../allVocabularyReview";
import type { AllVocabularyColumnKey, AllVocabularyReviewItem } from "../allVocabularyReview";
import { useAllVocabularyReviewSession } from "../hooks/useAllVocabularyReviewSession";
import "./AllVocabularyReview.css";

const columnLabels: Record<AllVocabularyColumnKey, string> = {
  meaning_practice: "meaning_practice",
  word: "word",
  pos: "pos",
  word_sense: "word_sense",
  word_practice: "word_practice",
  level: "level",
  langcode: "langcode",
  examples: "examples"
};

const formatCellValue = (value: string | number | null): string =>
  value === null || value === "" ? "—" : String(value);

export const AllVocabularyReview = ({
  userId,
  onExitRequest
}: {
  userId: string;
  onExitRequest: () => void;
}) => {
  const review = useAllVocabularyReviewSession(userId);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const resizingRef = useRef<{
    column: AllVocabularyColumnKey;
    pointerId: number;
    startX: number;
    startWidth: number;
    currentWidth: number;
  } | null>(null);
  const tableColumnsRef = useRef(new Map<AllVocabularyColumnKey, HTMLTableColElement>());
  const session = review.session;
  const visibleColumns = session
    ? allVocabularyColumnKeys.filter((column) => session.visibleColumns[column])
    : [];
  const itemsById = useMemo(
    () => new Map(session?.items.map((item) => [item.localId, item]) ?? []),
    [session?.items]
  );
  const orderedItems = session
    ? session.order.map((localId) => itemsById.get(localId)).filter((item): item is AllVocabularyReviewItem => Boolean(item))
    : [];
  const unansweredCount = session ? countAllVocabularyUnanswered(session) : 0;
  const activeAnswerColumn = session?.mode === "word-to-meaning" ? "meaning_practice" : "word_practice";

  const startColumnResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    column: AllVocabularyColumnKey
  ) => {
    if (!session) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const width = session.columnWidths[column];
    resizingRef.current = {
      column,
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
      currentWidth: width
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveColumnResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    column: AllVocabularyColumnKey
  ) => {
    const resize = resizingRef.current;
    if (!resize || resize.column !== column || resize.pointerId !== event.pointerId) {
      return;
    }

    const width = Math.round(Math.max(64, Math.min(1200, resize.startWidth + event.clientX - resize.startX)));
    resize.currentWidth = width;
    tableColumnsRef.current.get(column)?.style.setProperty("width", `${width}px`);
  };

  const finishColumnResize = (
    event: ReactPointerEvent<HTMLSpanElement>,
    column: AllVocabularyColumnKey,
    cancelled = false
  ) => {
    const resize = resizingRef.current;
    if (!resize || resize.column !== column || resize.pointerId !== event.pointerId) {
      return;
    }

    if (cancelled) {
      tableColumnsRef.current.get(column)?.style.setProperty("width", `${resize.startWidth}px`);
    } else {
      review.setColumnWidth(column, resize.currentWidth);
    }

    resizingRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderFocusShell = (content: ReactNode, controls?: ReactNode) => (
    <section className="vocab-review-all">
      <div className="vocab-review-all__focus-header">
        <div className="vocab-review-all__focus-controls">{controls}</div>
        <button className="vocab-review-all__exit" onClick={onExitRequest} type="button">
          <HomeIcon name="close" size={18} />
          Exit
        </button>
      </div>
      {content}
    </section>
  );

  const renderCell = (item: AllVocabularyReviewItem, column: AllVocabularyColumnKey) => {
    if (!session) {
      return null;
    }

    if (column === "meaning_practice" || column === "word_practice") {
      const cellValue = column === "meaning_practice"
        ? session.answers[item.localId]?.meaning_practice ?? ""
        : session.answers[item.localId]?.word_practice ?? "";

      if (column !== activeAnswerColumn) {
        return <span className="vocab-review-all__saved-answer">{cellValue || "—"}</span>;
      }

      return (
        <input
          aria-label={`${column === "meaning_practice" ? "Meaning" : "Word"} practice for ${item.word ?? "vocabulary"}`}
          defaultValue={cellValue}
          onBlur={review.refreshSessionView}
          onChange={(event) => review.setAnswer(item.localId, column, event.target.value)}
          placeholder={column === "meaning_practice" ? "Type the meaning" : "Type the word"}
          type="text"
        />
      );
    }

    return formatCellValue(item[column]);
  };

  if (review.stage === "checking" || review.stage === "loading") {
    return renderFocusShell(
      <div className="vocab-review-all__state" role="status">
        <span className="vocab-review-all__state-icon">✦</span>
        <h2>{review.stage === "checking" ? "Checking your saved session" : "Loading all vocabulary"}</h2>
        <p>{review.stage === "checking" ? "Looking for an unfinished All session on this device." : "Preparing the vocabulary table."}</p>
        <div className="vocab-review-all__loading-bar"><span /></div>
      </div>
    );
  }

  if (review.stage === "resume-choice") {
    return renderFocusShell(
      <div className="vocab-review-all__state">
        <span className="vocab-review-all__state-icon">↻</span>
        <h2>Continue your All session?</h2>
        <p>Your answers and table settings are saved on this device.</p>
        <div className="vocab-review-all__state-actions">
          <button className="vocab-review-all__button" onClick={review.continueSavedSession} type="button">
            Continue session
          </button>
          <button className="vocab-review-all__button vocab-review-all__button--secondary" onClick={() => void review.startNewSession()} type="button">
            Start new session
          </button>
        </div>
      </div>
    );
  }

  if (review.stage === "error") {
    return renderFocusShell(
      <div className="vocab-review-all__state vocab-review-all__state--error" role="alert">
        <span className="vocab-review-all__state-icon">!</span>
        <h2>Could not open All review</h2>
        <p>{review.error ?? "Please try again."}</p>
        <div className="vocab-review-all__state-actions">
          <button className="vocab-review-all__button" onClick={() => void review.startNewSession()} type="button">
            Try again
          </button>
          {review.savedSession?.status === "draft" ? (
            <button className="vocab-review-all__button vocab-review-all__button--secondary" onClick={review.continueSavedSession} type="button">
              Continue saved session
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (review.stage === "empty") {
    return renderFocusShell(
      <div className="vocab-review-all__state">
        <span className="vocab-review-all__state-icon">⌑</span>
        <h2>No saved vocabulary yet</h2>
        <p>The All vocabulary endpoint returned an empty list.</p>
      </div>
    );
  }

  if (review.stage === "submitted" && session?.result) {
    return renderFocusShell(
      <section className="vocab-review-all__result">
        <div className="vocab-review-all__result-heading">
          <span className="vocab-review-all__state-icon">✓</span>
          <div>
            <h2>All review complete</h2>
            <p>Your result is saved on this device.</p>
          </div>
        </div>
        <div className="vocab-review-all__score-grid">
          <article><span>Correct</span><strong>{session.result.correctCount}</strong></article>
          <article><span>Wrong</span><strong>{session.result.wrongCount}</strong></article>
          <article><span>Unanswered</span><strong>{session.result.unansweredCount}</strong></article>
        </div>
        <section className="vocab-review-all__wrong-list">
          <h3>Wrong words</h3>
          {session.result.wrongItems.length ? (
            <div className="vocab-review-all__table-wrap">
              <table>
                <thead>
                  <tr><th>word</th><th>pos</th><th>Your answer</th><th>Correct answer</th><th>level</th></tr>
                </thead>
                <tbody>
                  {session.result.wrongItems.map((item) => (
                    <tr key={item.localId}>
                      <td>{item.word || "—"}</td>
                      <td>{item.pos || "—"}</td>
                      <td>{item.userAnswer || "Unanswered"}</td>
                      <td>{item.expectedAnswer || "—"}</td>
                      <td>{formatCellValue(item.level)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="vocab-review-all__empty-wrong">No wrong words. Great work!</p>
          )}
        </section>
        <button className="vocab-review-all__button" onClick={() => void review.startNewSession()} type="button">
          Start a new All session
        </button>
      </section>
    );
  }

  if (!session) {
    return renderFocusShell(
      <div className="vocab-review-all__state" role="status">
        <h2>Preparing All review</h2>
      </div>
    );
  }

  return renderFocusShell(
    <div className="vocab-review-all__content" aria-label="All vocabulary review">
      {review.saveError ? (
        <div className="vocab-review-all__save-error" role="alert">
          <span>{review.saveError}</span>
          <button onClick={review.retrySave} type="button">Retry save</button>
        </div>
      ) : null}

      <div className="vocab-review-all__table-wrap">
        <table>
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column}
                ref={(node) => {
                  if (node) {
                    tableColumnsRef.current.set(column, node);
                  } else {
                    tableColumnsRef.current.delete(column);
                  }
                }}
                style={{ width: `${session.columnWidths[column]}px` }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th key={column} style={{ width: `${session.columnWidths[column]}px` }}>
                  {columnLabels[column]}
                  <span
                    aria-label={`Resize ${columnLabels[column]} column`}
                    aria-orientation="vertical"
                    aria-valuemax={1200}
                    aria-valuemin={64}
                    aria-valuenow={session.columnWidths[column]}
                    className="vocab-review-all__resize-handle"
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                        event.preventDefault();
                        review.setColumnWidth(
                          column,
                          session.columnWidths[column] + (event.key === "ArrowRight" ? 16 : -16)
                        );
                      }
                    }}
                    onPointerCancel={(event) => finishColumnResize(event, column, true)}
                    onPointerDown={(event) => startColumnResize(event, column)}
                    onPointerMove={(event) => moveColumnResize(event, column)}
                    onPointerUp={(event) => finishColumnResize(event, column)}
                    role="separator"
                    tabIndex={0}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedItems.map((item) => (
              <tr key={item.localId}>
                {visibleColumns.map((column) => (
                  <td key={`${item.localId}-${column}`} className={column === "examples" || column === "word_sense" ? "vocab-review-all__long-text" : ""}>
                    {renderCell(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="vocab-review-all__submit-row">
        <span>{session.items.length.toLocaleString("en-US")} words · {unansweredCount.toLocaleString("en-US")} unanswered</span>
        <button className="vocab-review-all__button" onClick={() => setIsSubmitConfirmOpen(true)} type="button">
          Submit answers
        </button>
      </div>

      {isSubmitConfirmOpen ? (
        <div className="vocab-review-all__dialog-backdrop" role="presentation">
          <section aria-modal="true" className="vocab-review-all__dialog" role="dialog">
            <h2>Submit this session?</h2>
            <p>{unansweredCount ? `${unansweredCount} unanswered ${unansweredCount === 1 ? "word" : "words"} will count as wrong.` : "Your answers will be checked and this session will be completed."}</p>
            <div>
              <button className="vocab-review-all__button vocab-review-all__button--secondary" onClick={() => setIsSubmitConfirmOpen(false)} type="button">Keep studying</button>
              <button className="vocab-review-all__button" onClick={review.submitSession} type="button">Submit</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>,
    <div className="vocab-review-all__toolbar">
        <div className="vocab-review-all__mode-group" aria-label="Practice direction">
          <button
            aria-pressed={session.mode === "word-to-meaning"}
            className={session.mode === "word-to-meaning" ? "is-active" : ""}
            onClick={() => review.setMode("word-to-meaning")}
            type="button"
          >
            Word → meaning
          </button>
          <button
            aria-pressed={session.mode === "meaning-to-word"}
            className={session.mode === "meaning-to-word" ? "is-active" : ""}
            onClick={() => review.setMode("meaning-to-word")}
            type="button"
          >
            Meaning → word
          </button>
        </div>
        <div className="vocab-review-all__tools">
          <button className="vocab-review-all__button vocab-review-all__button--secondary" onClick={review.shuffleOrder} type="button">
            Shuffle words
          </button>
          <details className="vocab-review-all__column-menu">
            <summary>Columns</summary>
            <div>
              {allVocabularyColumnKeys.map((column) => (
                <label key={column}>
                  <input
                    checked={session.visibleColumns[column]}
                    disabled={session.visibleColumns[column] && visibleColumns.length <= 1}
                    onChange={() => review.toggleColumn(column)}
                    type="checkbox"
                  />
                  {columnLabels[column]}
                </label>
              ))}
            </div>
          </details>
        </div>
    </div>
  );
};
