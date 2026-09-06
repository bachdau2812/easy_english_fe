import { type ReactNode, useRef, useState } from "react";
import type { IeltsReadingQuestion, IeltsReadingQuestionGroup } from "../types";
import {
  type ReadingQuizAnswer, type ReadingQuizAnswers, ReadingQuizGroup,
  getReadingGroupId, getReadingGroupQuestions, getReadingGroupStart, getReadingGroupEnd,
  getReadingQuestionKey, getReadingQuestionNumber, getReadingQuestionStatus,
  getReadingQuestionType, getReadingTypeLabel, getReadingQuestionDomId
} from "./ReadingQuiz";

interface ReadingQuizPanelProps {
  answers: ReadingQuizAnswers;
  children?: ReactNode;
  groups: IeltsReadingQuestionGroup[];
  onAnswerChange: (question: IeltsReadingQuestion, value: ReadingQuizAnswer) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const ReadingQuizPanel = ({ answers, children, groups, onAnswerChange, onClose, onSubmit }: ReadingQuizPanelProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [navigationPage, setNavigationPage] = useState(0);
  const pageSize = 8;
  const items = groups.flatMap((group, groupIndex) => getReadingGroupQuestions(group).map((question) => ({
    question, groupIndex, key: getReadingQuestionKey(question), answered: getReadingQuestionStatus(question, answers, group)
  })));
  const current = items.find((item) => item.key === currentKey) ?? items[0];
  const activeGroup = current ? groups[current.groupIndex] : groups[0];
  const activeQuestions = activeGroup ? getReadingGroupQuestions(activeGroup) : [];
  const start = activeGroup ? getReadingGroupStart(activeGroup, activeQuestions) : null;
  const end = activeGroup ? getReadingGroupEnd(activeGroup, activeQuestions) : null;
  const answered = items.filter((item) => item.answered).length;
  const lastPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
  const visiblePage = Math.min(navigationPage, lastPage);
  const visibleItems = items.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);

  const trackQuestion = (key: string) => {
    setCurrentKey(key);
    const index = items.findIndex((item) => item.key === key);
    if (index >= 0) setNavigationPage(Math.floor(index / pageSize));
  };

  const navigateToQuestion = (key: string) => {
    const body = contentRef.current;
    const target = body?.querySelector<HTMLElement>(`[id="${getReadingQuestionDomId(key, "attempt")}"]`);
    if (!body || !target) return;
    body.scrollTo({ top: body.scrollTop + target.getBoundingClientRect().top - body.getBoundingClientRect().top - 16, behavior: "instant" });
    const control = target.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled)");
    (control ?? target).focus({ preventScroll: true });
    trackQuestion(key);
  };

  return (
    <aside aria-label="IELTS Reading quiz" className="ielts-quiz-panel" data-single-group={groups.length === 1}>
      <header className="ielts-quiz-header">
        <div className="ielts-quiz-header__title">
          <h2>{activeGroup ? getReadingTypeLabel(getReadingQuestionType(activeGroup)) : "Reading quiz"}</h2>
          <button aria-label="Close reading quiz" className="ielts-quiz-close" onClick={onClose} type="button">×</button>
        </div>
        {items.length > 0 ? <>
          <div className="ielts-quiz-header__meta">
            <span>{start != null ? `Questions ${start}${end != null && end !== start ? `–${end}` : ""}` : `${activeQuestions.length} questions`}</span>
            <span role="status"><strong>{answered}</strong> / {items.length} answered</span>
          </div>
          <progress aria-label="Quiz answers completed" max={items.length} value={answered} />
        </> : null}
      </header>
      <div
        className="ielts-quiz-body" ref={contentRef}
        onFocusCapture={(event) => {
          const key = (event.target as HTMLElement).closest<HTMLElement>("[data-question-key]")?.dataset.questionKey;
          if (key) trackQuestion(key);
        }}
        onScroll={() => {
          const body = contentRef.current;
          if (!body) return;
          const bounds = body.getBoundingClientRect();
          const focused = document.activeElement?.closest<HTMLElement>("[data-question-key]");
          if (focused && body.contains(focused)) {
            const controlBounds = document.activeElement!.getBoundingClientRect();
            if (controlBounds.top >= bounds.top && controlBounds.bottom <= bounds.bottom && focused.dataset.questionKey) {
              trackQuestion(focused.dataset.questionKey);
              return;
            }
          }
          const top = bounds.top + 24;
          const visible = Array.from(body.querySelectorAll<HTMLElement>("[data-question-key]"))
            .find((element) => element.getBoundingClientRect().bottom > top);
          if (visible?.dataset.questionKey) trackQuestion(visible.dataset.questionKey);
        }}
      >
        {children}
        {groups.map((group, index) => <ReadingQuizGroup answers={answers} group={group} key={getReadingGroupId(group, index)} onChange={onAnswerChange} />)}
      </div>
      {items.length > 0 ? <footer className="ielts-quiz-footer">
        <nav aria-label="Question navigation" className="ielts-quiz-navigator">
          {lastPage > 0 ? <button aria-label="Previous question numbers" disabled={visiblePage === 0} onClick={() => setNavigationPage(visiblePage - 1)} type="button">‹</button> : null}
          {visibleItems.map((item, index) => <button
            aria-current={current?.key === item.key ? "step" : undefined}
            aria-label={`Question ${getReadingQuestionNumber(item.question) ?? visiblePage * pageSize + index + 1}, ${item.answered ? "answered" : "unanswered"}`}
            className={item.answered ? "is-answered" : ""}
            key={item.key} onClick={() => navigateToQuestion(item.key)} type="button"
          >{getReadingQuestionNumber(item.question) ?? visiblePage * pageSize + index + 1}{item.answered ? <span aria-hidden="true">✓</span> : null}</button>)}
          {lastPage > 0 ? <button aria-label="Next question numbers" disabled={visiblePage === lastPage} onClick={() => setNavigationPage(visiblePage + 1)} type="button">›</button> : null}
        </nav>
        <div className="ielts-quiz-footer__actions">
          <span role="status">{items.length - answered ? <><strong>{items.length - answered}</strong> unanswered</> : "All questions answered"}</span>
          <button className="ielts-quiz-submit" onClick={onSubmit} type="button">Submit quiz</button>
        </div>
      </footer> : null}
    </aside>
  );
};
