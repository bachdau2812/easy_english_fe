import type { IeltsReadingQuestion, IeltsReadingQuestionGroup } from "../types";
import "./ReadingQuiz.css";

export type ReadingQuizAnswer = string | string[];
export type ReadingQuizAnswers = Record<string, ReadingQuizAnswer>;
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

export const getReadingQuizGroups = (value: unknown): IeltsReadingQuestionGroup[] => {
  const root = asReadingRecord(value);
  const result = asReadingRecord(root?.result);
  const response = result ?? root;
  const quiz = asReadingRecord(response?.quiz) ?? response;
  const groups = quiz?.question_groups ?? quiz?.questionGroups;

  return Array.isArray(groups) ? (groups as IeltsReadingQuestionGroup[]) : [];
};

export const getReadingQuestionType = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { questionType?: string | null; question_type?: string | null };
  return record.question_type ?? record.questionType ?? "";
};

export const getReadingGroupId = (group: IeltsReadingQuestionGroup, fallback: number) => {
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
  return value;
};

export const getReadingGroupStart = (group: IeltsReadingQuestionGroup, questions: IeltsReadingQuestion[]) => {
  const record = group as IeltsReadingQuestionGroup & { questionNumberStart?: number | null; question_number_start?: number | null };
  return record.question_number_start ?? record.questionNumberStart ?? questions[0]?.number ?? null;
};

export const getReadingGroupEnd = (group: IeltsReadingQuestionGroup, questions: IeltsReadingQuestion[]) => {
  const record = group as IeltsReadingQuestionGroup & { questionNumberEnd?: number | null; question_number_end?: number | null };
  return record.question_number_end ?? record.questionNumberEnd ?? questions[questions.length - 1]?.number ?? null;
};

const getReadingAllowOptionReuse = (group: IeltsReadingQuestionGroup) => {
  const record = group as IeltsReadingQuestionGroup & { allowOptionReuse?: boolean | null; allow_option_reuse?: boolean | null };
  return Boolean(record.allow_option_reuse ?? record.allowOptionReuse);
};

export const getReadingGroupQuestions = (group: IeltsReadingQuestionGroup): IeltsReadingQuestion[] => {
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

export const getReadingQuestionKey = (question: IeltsReadingQuestion) =>
  getReadingQuestionId(question) ?? String(getReadingQuestionNumber(question) ?? getReadingQuestionStem(question));

export const getReadingQuestionNumber = (question: IeltsReadingQuestion) => question.number ?? null;
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

export const getReadingQuestionStatus = (question: IeltsReadingQuestion, answers: ReadingQuizAnswers, group?: IeltsReadingQuestionGroup) => {
  const value = answers[getReadingQuestionKey(question)];
  if (Array.isArray(value)) {
    const required = group ? getReadingRequiredSelectionCount(group, question) : 1;
    return value.filter(Boolean).length >= required;
  }
  return typeof value === "string" && value.trim().length > 0;
};

export const isReadingQuestionCorrect = (question: IeltsReadingQuestion, value: ReadingQuizAnswer | undefined) => {
  const answers = getReadingQuestionAnswer(question);
  const userAnswers = Array.isArray(value) ? value : value ? [value] : [];
  if (!answers.length || !userAnswers.length || answers.length !== userAnswers.length) return false;
  const expected = answers.map(normalizeReadingAnswer).sort();
  const actual = userAnswers.map(normalizeReadingAnswer).sort();
  return expected.every((answer, index) => answer === actual[index]);
};

export const getReadingTypeLabel = (type: string) =>
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
  <span className="ielts-quiz-number">{getReadingQuestionNumber(question) ?? "?"}</span>
);

const ReadingInstructionPanel = ({ group }: { group: IeltsReadingQuestionGroup }) => {
  const instruction = getReadingGroupInstruction(group);
  const wordLimit = getReadingGroupWordLimit(group);
  const allowReuse = getReadingAllowOptionReuse(group);
  const type = getReadingQuestionType(group);

  if (!instruction && !wordLimit && !type.startsWith("matching_") && !(type === "summary_completion" && getReadingSharedOptions(group).length)) return null;

  return (
    <div className="ielts-quiz-instruction-panel">
      {instruction ? <p>{instruction}</p> : null}
      <div>
        {wordLimit ? <span>{wordLimit}</span> : null}
        {(type.startsWith("matching_") || (type === "summary_completion" && getReadingSharedOptions(group).length > 0)) && !allowReuse ? <small>Options can be used once.</small> : null}
        {allowReuse ? <small>Options may be used more than once.</small> : null}
      </div>
    </div>
  );
};

const ReadingSharedOptionsPanel = ({ options, title, usedValues }: { options: ReadingChoiceOption[]; title: string; usedValues?: Set<string> }) => {
  if (!options.length) return null;

  return (
    <aside className="ielts-quiz-shared-panel">
      <strong>{title}</strong>
      <div>
        {options.map((option) => (
          <span className={`${usedValues?.has(option.value) ? "is-used" : ""} ${option.text ? "" : "is-text-only"}`} key={option.value}>
            <b>{option.label}</b>
            {option.text ? <em>{option.text}</em> : null}
            {usedValues?.has(option.value) ? <small>Already used</small> : null}
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
    <div className={`ielts-quiz-feedback ${!isAnswered ? "is-empty" : isCorrect ? "is-correct" : "is-wrong"}`}>
      <p className="ielts-quiz-feedback__status"><strong>{!isAnswered ? "Unanswered" : isCorrect ? "✓ Correct" : "✕ Incorrect"}</strong></p>
      <p><strong>Your answer:</strong> {Array.isArray(value) ? value.join(", ") : value || "No answer"}</p>
      <p><strong>Correct answer:</strong> {getReadingQuestionAnswer(question).join(", ") || "No answer returned"}</p>
      {evidence ? <blockquote><strong>Evidence</strong>{evidence}</blockquote> : null}
      {explanation ? <p><strong>Explanation:</strong> {explanation}</p> : null}
    </div>
  );
};

export const getReadingQuestionDomId = (key: string, mode: ReadingQuizMode) =>
  `ielts-${mode}-${encodeURIComponent(key)}`;

const questionTarget = (question: IeltsReadingQuestion, mode: ReadingQuizMode) => ({
  id: getReadingQuestionDomId(getReadingQuestionKey(question), mode),
  "data-question-key": getReadingQuestionKey(question),
  tabIndex: -1
});

const answerState = (question: IeltsReadingQuestion, value: ReadingQuizAnswer | undefined, mode: ReadingQuizMode) =>
  mode === "review" ? (isReadingQuestionCorrect(question, value) ? "is-correct" : "is-incorrect") :
    (Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())) ? "is-answered" : "";

const ReadingMatchingDropdown = ({ disabled, disabledValues, onChange, options, question, value }: {
  disabled: boolean;
  disabledValues?: Set<string>;
  onChange: (value: string) => void;
  options: ReadingChoiceOption[];
  question: IeltsReadingQuestion;
  value: string;
}) => (
  <div className="ielts-quiz-matching">
    <select
      aria-label={`Question ${getReadingQuestionNumber(question) ?? ""}: ${getReadingQuestionStem(question)}`}
      className={value ? "is-answered" : ""}
      disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}
    >
      <option value="">Select an answer</option>
      {options.map((option) => {
        const used = Boolean(disabledValues?.has(option.value) && option.value !== value);
        return <option disabled={used} key={option.value} value={option.value}>
          {option.display}{used ? " — Already used" : ""}
        </option>;
      })}
    </select>
    {value ? <span className="ielts-quiz-matching__selection">{options.find((option) => option.value === value)?.display ?? value}</span> : null}
  </div>
);

const MultipleChoiceOption = ({ option, question, selected, disabled, mode, type, onChange }: {
  option: ReadingChoiceOption;
  question: IeltsReadingQuestion;
  selected: boolean;
  disabled: boolean;
  mode: ReadingQuizMode;
  type: "radio" | "checkbox";
  onChange: (checked: boolean) => void;
}) => {
  const correct = mode === "review" && getReadingQuestionAnswer(question).some((answer) => normalizeReadingAnswer(answer) === normalizeReadingAnswer(option.value));
  const state = correct ? "is-correct" : mode === "review" && selected ? "is-incorrect" : selected ? "is-selected" : "";
  return <label className={`ielts-quiz-option ${state} ${option.text ? "" : "is-text-only"}`}>
    <input checked={selected} disabled={disabled} name={`${mode}-${getReadingQuestionKey(question)}`} type={type}
      onChange={(event) => onChange(event.target.checked)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !disabled) {
          event.preventDefault();
          onChange(type === "checkbox" ? !selected : true);
        }
      }} />
    <span className="ielts-quiz-option__label">{option.label}{option.text ? "." : ""}</span>
    {option.text ? <span className="ielts-quiz-option__text">{option.text}</span> : null}
    {correct ? <small>✓ Correct</small> : mode === "review" && selected ? <small>✕ Your answer</small> : null}
  </label>;
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
    <article {...questionTarget(question, mode)} className={`ielts-quiz-question ielts-quiz-question--matching ${answerState(question, answers[key], mode)}`}>
      <div className="ielts-quiz-question__stem">
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
    <article {...questionTarget(question, mode)} className={`ielts-quiz-question ${answerState(question, answers[getReadingQuestionKey(question)], mode)}`}>
      <div className="ielts-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <div aria-label={getReadingQuestionStem(question)} className="ielts-quiz-options" role="radiogroup">
        {options.map((option) => <MultipleChoiceOption key={option.value} option={option} question={question}
          selected={value === option.value} disabled={mode === "review"} mode={mode} type="radio"
          onChange={() => onChange(question, option.value)} />)}
      </div>
      {mode === "attempt" && value ? <button className="ielts-quiz-clear" type="button" onClick={() => onChange(question, "")}>Clear answer</button> : null}
      {mode === "review" ? <ReadingReviewFeedback question={question} value={answers[key]} /> : null}
    </article>
  );
};

const ThreeChoiceAnswer = ({
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
  const options = choices.map((choice) => ({ display: choice, label: choice.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()), text: "", value: choice }));
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
    <article {...questionTarget(question, mode)} className={`ielts-quiz-question ${answerState(question, answers[getReadingQuestionKey(question)], mode)}`}>
      <div className="ielts-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <div className="ielts-quiz-selection-count" role="status">
        <span>Choose {required} answers</span><span>{selected.length} / {required} selected</span>
      </div>
      <div aria-label={`${getReadingQuestionStem(question)} Choose ${required} answers.`} className="ielts-quiz-options" role="group">
        {options.map((option) => <MultipleChoiceOption key={option.value} option={option} question={question}
          selected={selected.includes(option.value)}
          disabled={mode === "review" || (!selected.includes(option.value) && selected.length >= required)}
          mode={mode} type="checkbox"
          onChange={(checked) => onChange(question, checked ? [...selected, option.value] : selected.filter((item) => item !== option.value))} />)}
      </div>
      {mode === "attempt" && selected.length >= required ? <small className="ielts-quiz-limit-hint">Selection limit reached. Uncheck an answer to choose another.</small> : null}
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
    <article {...questionTarget(question, mode)} className={`ielts-quiz-question ${answerState(question, answers[getReadingQuestionKey(question)], mode)}`}>
      <div className="ielts-quiz-question__stem">
        <ReadingQuestionNumberBadge question={question} />
        <p>{getReadingQuestionStem(question)}</p>
      </div>
      <input
        aria-label={`Question ${getReadingQuestionNumber(question) ?? ""}`}
        disabled={mode === "review"}
        onChange={(event) => onChange(question, event.target.value)}
        placeholder="Enter your answer…"
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
  const stem = getReadingQuestionStem(question);
  if (!/\{\{Q\d+\}\}/.test(stem)) {
    return <ReadingTextQuestion answers={answers} group={group} mode={mode} onChange={onChange} question={question} />;
  }
  const parts = stem.split(/(\{\{Q\d+\}\})/g);

  return (
    <article {...questionTarget(question, mode)} className={`ielts-quiz-question ielts-quiz-question--sentence ${answerState(question, answers[key], mode)}`}>
      <div className="ielts-quiz-question__stem ielts-quiz-question__stem--inline">
        <ReadingQuestionNumberBadge question={question} />
        <p>
        {parts.map((part, index) =>
          /\{\{Q\d+\}\}/.test(part) ? (
            <span className="ielts-quiz-gap" key={`${key}-${index}`}>
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
    <div className="ielts-quiz-summary-context">
      {context.split(/(\{\{Q\d+\}\})/g).map((part, index) => {
        const match = part.match(/\{\{Q(\d+)\}\}/);
        if (!match) return <span key={`${part}-${index}`}>{part}</span>;
        const question = questions.find((item) => getReadingQuestionNumber(item) === Number(match[1]));
        if (!question) return <span key={part}>{part}</span>;
        const key = getReadingQuestionKey(question);
        const value = typeof answers[key] === "string" ? answers[key] as string : "";
        return (
          <span {...questionTarget(question, mode)} className={`ielts-quiz-gap ${answerState(question, answers[key], mode)}`} key={key}>
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
                placeholder="Answer"
                value={value}
              />
            )}
          </span>
        );
      })}
      {questions.filter((question) => !context.includes(`{{Q${getReadingQuestionNumber(question)}}}`)).map((question) => (
        options.length ? <ReadingSelectQuestion answers={answers} disabledValues={allowReuse ? undefined : usedValues} mode={mode} onChange={onChange} options={options} question={question} key={getReadingQuestionKey(question)} /> :
          <ReadingTextQuestion answers={answers} group={group} mode={mode} onChange={onChange} question={question} key={getReadingQuestionKey(question)} />
      ))}
      {mode === "review" ? questions.filter((question) => context.includes(`{{Q${getReadingQuestionNumber(question)}}}`)).map((question) => <ReadingReviewFeedback key={getReadingQuestionKey(question)} question={question} value={answers[getReadingQuestionKey(question)]} />) : null}
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
    return <ThreeChoiceAnswer answers={answers} choices={["TRUE", "FALSE", "NOT GIVEN"]} mode={mode} onChange={onChange} question={question} />;
  }

  if (type === "yes_no_not_given") {
    return <ThreeChoiceAnswer answers={answers} choices={["YES", "NO", "NOT GIVEN"]} mode={mode} onChange={onChange} question={question} />;
  }

  if (type === "sentence_completion") {
    return <ReadingSentenceCompletionQuestion answers={answers} group={group} mode={mode} onChange={onChange} question={question} />;
  }

  if (type === "short_answer") {
    return <ReadingTextQuestion answers={answers} group={group} mode={mode} onChange={onChange} question={question} />;
  }

  return (
    <article {...questionTarget(question, mode)} className={`ielts-quiz-question ${answerState(question, answers[getReadingQuestionKey(question)], mode)}`}>
      <p>This question type is not supported yet.</p>
    </article>
  );
};

export const ReadingQuizGroup = ({
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
    <section className={`ielts-quiz-group ielts-quiz-group--${type || "unknown"}`}>
      <header className="ielts-quiz-group__header">
        <div>
          <h3>{getReadingTypeLabel(type)}</h3>
          <span>{getReadingGroupStart(group, questions) != null ? `Questions ${getReadingGroupStart(group, questions)}–${getReadingGroupEnd(group, questions)}` : `${questions.length} questions`}</span>
        </div>
        <small>{answeredCount} of {questions.length} answered</small>
      </header>
      <ReadingInstructionPanel group={group} />
      {type === "yes_no_not_given" ? <p className="ielts-quiz-helper">This question asks about the writer&apos;s views or claims.</p> : null}
      {context && type !== "summary_completion" ? <pre className="ielts-quiz-context">{context}</pre> : null}
      <div className={showSharedOptions ? "ielts-quiz-workspace" : "ielts-quiz-workspace ielts-quiz-workspace--single"}>
        {showSharedOptions ? <ReadingSharedOptionsPanel options={sharedOptions} title={sharedTitle} usedValues={getReadingAllowOptionReuse(group) ? undefined : usedValues} /> : null}
        <div className="ielts-quiz-questions">
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

