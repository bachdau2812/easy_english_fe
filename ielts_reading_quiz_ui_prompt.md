# Prompt: IELTS Reading Quiz Presentation UI

You are a senior frontend engineer and product designer. Build the **quiz presentation layer** for an IELTS Academic Reading application using:

- React
- TypeScript
- Tailwind CSS

Focus only on presenting IELTS Reading question groups and collecting user answers. Do not build authentication, backend APIs, database access, payment, dashboards, or unrelated pages.

The interface must be clean, modern, academic, easy to scan, easy to operate, responsive, accessible, and visually polished without being flashy or overly colorful.

---

## 1. Main objective

Create a reusable quiz UI system that renders question groups from structured JSON.

Each item in:

```ts
quiz.question_groups[]
```

is one renderable question block.

The UI must:

1. Render each group according to `question_type`.
2. Render `instruction` once per group.
3. Render `context` only when it is not empty.
4. Render `shared_options` when the question type needs a shared list, word bank, headings list, people list, or feature list.
5. Render `questions[]` as numbered answer controls.
6. Support both `attempt` and `review` modes.
7. Never reveal correct answers while the learner is attempting the quiz.
8. Work well on desktop, tablet, and mobile.

---

## 2. Supported question types

Support these exact values:

```ts
type QuestionType =
  | "matching_features"
  | "matching_headings"
  | "matching_information"
  | "multiple_choice_multiple"
  | "multiple_choice_single"
  | "sentence_completion"
  | "short_answer"
  | "summary_completion"
  | "true_false_not_given"
  | "yes_no_not_given";
```

---

## 3. Data model assumptions

Use strict TypeScript types similar to:

```ts
export interface QuizOption {
  label: string;
  text: string;
}

export interface QuizQuestion {
  question_id: string;
  number: number;
  stem: string;
  options: QuizOption[];

  // Review-only metadata
  answer?: string[];
  evidence_quote?: string;
  explanation?: string;
  difficulty?: string;
  skill?: string;
}

export interface QuestionGroup {
  group_id: string;
  question_type: QuestionType;
  instruction: string;
  question_number_start: number;
  question_number_end: number;
  context: string;
  allow_option_reuse: boolean;
  word_limit: string;
  source_paragraph_ids: string[];
  shared_options: QuizOption[];
  questions: QuizQuestion[];
}

export type AnswerValue = string | string[];

export interface QuizAnswerState {
  [questionId: string]: AnswerValue;
}

export type QuizMode = "attempt" | "review";
```

During `attempt` mode, do not display:

```ts
answer
evidence_quote
explanation
difficulty
skill
```

These fields may appear only in `review` mode after submission.

---

# 4. Design direction

## 4.1 Visual style

Use a restrained academic design system.

Preferred characteristics:

- neutral page background;
- white or warm-white content surfaces;
- one main accent family, preferably blue or indigo;
- subtle borders;
- very light shadows only where needed;
- medium corner radius;
- generous spacing;
- strong typography hierarchy;
- high contrast;
- calm visual rhythm.

Avoid:

- strong gradients;
- glassmorphism;
- neon colors;
- large decorative illustrations;
- excessive shadows;
- animations that distract from reading;
- a different color palette for every question type;
- oversized badges;
- deeply nested cards;
- excessive pill-shaped elements;
- green/red answer colors before submission.

The finished interface should feel like a serious IELTS preparation product, not a generic survey form.

## 4.2 Typography

Use Inter or the existing application font.

Recommended hierarchy:

```text
Question range: text-lg or text-xl, font-semibold
Question type label: text-xs or text-sm, font-medium, muted
Instruction: text-sm or text-base, leading-6
Question stem: text-base, leading-7
Option text: text-sm or text-base
Supporting metadata: text-xs or text-sm, muted
```

Do not use tiny text for essential instructions.

## 4.3 Spacing

Use consistent spacing:

- group container: `p-4`, `p-5`, or `p-6`;
- major sections: `space-y-5` or `space-y-6`;
- questions: `space-y-4`;
- options: `space-y-2`;
- controls: minimum height 40–44px;
- mobile horizontal padding: at least 16px.

Do not compress long questions into dense rows.

---

# 5. Question group anatomy

Every question group must share the same high-level structure:

```text
QuestionGroupCard
├── GroupHeader
│   ├── Question range
│   ├── Human-readable question type
│   └── Answered progress
│
├── InstructionPanel
│   ├── Instruction
│   ├── Word limit, when present
│   └── Reuse rule, when relevant
│
├── ContextOrSharedOptions
│   ├── List of headings
│   ├── People or features
│   ├── Word bank
│   ├── Summary text
│   └── Other structured context
│
└── Questions
    ├── Question number
    ├── Stem or statement
    └── Answer control
```

Use one main outer surface per group. Do not put every small element inside another card.

## 5.1 Group header

Display:

```text
Questions 4–8
True / False / Not Given
3 of 5 answered
```

The answered count should be visible but visually secondary.

## 5.2 Instruction panel

Render `group.instruction` once.

When `word_limit` is present, show it prominently but calmly.

Example:

```text
Complete the sentences below.
Choose NO MORE THAN TWO WORDS from the passage for each answer.
```

Use a subtle tinted background or bordered panel, not warning styling.

## 5.3 Context and shared options

Render `context` only when it contains meaningful text.

Render `shared_options` when required by the question type.

Shared option lists must:

- remain readable while answering;
- use clear labels;
- wrap long text correctly;
- remain visible even after an option is used;
- mark used options subtly when reuse is not allowed;
- not disappear completely after selection.

---

# 6. Interaction states

## 6.1 Attempt mode

Support:

- unanswered;
- answered;
- focused;
- flagged for review;
- disabled while submitting.

Do not show correct/incorrect feedback in attempt mode.

Do not show evidence or explanations.

Selected controls may use the accent color.

## 6.2 Review mode

After submission, support:

- correct;
- incorrect;
- unanswered.

Review mode may display:

```text
Your answer
Correct answer
Evidence from the passage
Explanation
```

Use restrained semantic colors:

- green for correct;
- red for incorrect;
- amber or neutral gray for unanswered.

Apply semantic colors locally to the relevant control or feedback area rather than recoloring the whole card.

## 6.3 Accessibility

All controls must be keyboard accessible.

Requirements:

- visible focus rings;
- semantic radio inputs;
- semantic checkbox inputs;
- associated labels;
- accessible names for selects and inline inputs;
- segmented controls must behave as radio groups;
- answer feedback must be associated with its control;
- do not use clickable `div` elements without keyboard support.

---

# 7. Responsive behavior

## Desktop

- Main question content width: approximately 720–960px.
- Shared options may sit beside questions when this improves scanning.
- Multiple-choice options stay vertically stacked.
- Matching headings may use two columns.

## Tablet

- Move shared option lists above questions when columns become cramped.
- Preserve comfortable padding.
- Avoid squeezing long question text.

## Mobile

- Use one column.
- Make selects and text inputs full width when needed.
- Allow inline completion inputs to move below the sentence.
- Allow three-option controls to wrap or stack.
- Put shared option panels above questions.
- Keep touch targets at least 44px high.
- Avoid horizontal scrolling.

---

# 8. Component architecture

Create reusable components such as:

```text
QuestionGroupRenderer
QuestionGroupCard
QuestionGroupHeader
InstructionPanel
SharedOptionsPanel
QuestionNumberBadge
QuestionReviewFeedback

MultipleChoiceSingleGroup
MultipleChoiceMultipleGroup
TrueFalseNotGivenGroup
YesNoNotGivenGroup
SentenceCompletionGroup
ShortAnswerGroup
SummaryCompletionGroup
MatchingHeadingsGroup
MatchingFeaturesGroup
MatchingInformationGroup
```

Use a central renderer:

```tsx
<QuestionGroupRenderer
  group={group}
  answers={answers}
  mode="attempt"
  onAnswerChange={handleAnswerChange}
/>
```

Switch by `group.question_type`.

Do not put every question type into one huge component.

---

# 9. Shared control specifications

## 9.1 Question number

Use a consistent compact number marker:

- 28–32px;
- square or circle;
- medium font weight;
- neutral in attempt mode;
- semantic styling only in review mode.

Do not make numbers oversized.

## 9.2 Radio option card

Use for one-answer multiple choice.

Each row contains:

```text
[radio] [option label] [option text]
```

Requirements:

- whole row is clickable;
- selected row uses accent border and very light tint;
- hover state is subtle;
- focus ring is visible;
- long text wraps naturally.

## 9.3 Checkbox option card

Use for multiple-answer questions.

Display:

- checkbox;
- option label;
- option text;
- selection counter above the options.

Do not automatically remove existing selections.

Prevent selecting more than the required number.

## 9.4 Select control

Use for matching tasks.

Requirements:

- placeholder such as `Select an answer`;
- full width on mobile;
- enough width for readable option text;
- used options disabled only when reuse is prohibited;
- selected labels remain visible in review mode.

## 9.5 Text input

Use for completion and short-answer tasks.

Requirements:

- trim surrounding whitespace for validation;
- preserve the user's visible text;
- do not auto-correct spelling;
- do not silently change capitalization;
- show word limit nearby;
- use an appropriate width on desktop;
- allow full width on mobile.

---

# 10. Question-type presentation specifications

## 10.1 `multiple_choice_single`

Use one radio group per question.

For every question:

1. Show the question number.
2. Show the stem.
3. Render options vertically as radio option cards.
4. Make the entire option row clickable.
5. Allow one selected option only.
6. Do not render an empty context block.

Example:

```text
1  What does the writer suggest about the current wildfires?

   ○ A  They are being fought by less experienced teams.
   ● B  They are more difficult to predict and control.
   ○ C  They are primarily caused by the winds.
   ○ D  They are smaller but burn for longer.
```

Store the selected label:

```ts
answers[question.question_id] = "B";
```

---

## 10.2 `multiple_choice_multiple`

Use checkbox cards.

Requirements:

1. Render the instruction exactly because it defines whether the user must choose two or three options.
2. Show a compact counter such as `1 of 2 selected`.
3. Prevent selecting more than the permitted number.
4. Do not automatically deselect an earlier answer.
5. Keep every option visible.

Store selected labels:

```ts
answers[question.question_id] = ["A", "D"];
```

Use explicit metadata for the required selection count when available. Otherwise derive it carefully from the instruction.

---

## 10.3 `true_false_not_given`

For each statement:

1. Show number and statement.
2. Render a three-option segmented radio group:

```text
TRUE | FALSE | NOT GIVEN
```

3. Use equal-width controls when possible.
4. Stack or wrap on very small screens.
5. Do not use green or red before submission.

Generate these choices from the question type even when `question.options` is empty.

---

## 10.4 `yes_no_not_given`

Use the same visual pattern as True/False/Not Given, but use:

```text
YES | NO | NOT GIVEN
```

Show a subtle helper message once per group:

```text
This question asks about the writer's views or claims.
```

Do not repeat the helper for every question.

---

## 10.5 `sentence_completion`

Replace placeholders such as `{{Q9}}` directly inside each sentence.

Example source:

```text
The primary fuel for megafires is currently {{Q9}}.
```

Rendered result:

```text
The primary fuel for megafires is currently [ 9 __________ ].
```

Requirements:

1. Show instruction and word limit clearly.
2. Render the input inline when space allows.
3. Allow the input to move below the sentence on mobile.
4. Show the question number near the gap.
5. Do not render empty option lists.
6. Parse placeholders safely using React elements, not unsafe HTML injection.

Support placeholders such as:

```text
{{Q9}}
{{Q12}}
{{Q13}}
```

---

## 10.6 `short_answer`

For each question:

1. Show question number and stem.
2. Render a short text input below the stem.
3. Show the word limit above or beside the input.
4. Use a normal input, not a textarea, unless a long response is explicitly required.
5. Use a moderate width on desktop and full width on mobile.

Example:

```text
14  Which organization introduced the new policy?

    [ Enter your answer ]
```

---

## 10.7 `summary_completion`

Render `group.context` as one continuous summary.

Replace every `{{Qn}}` placeholder with:

- a text input when `shared_options` is empty;
- a dropdown when `shared_options` contains options.

Requirements:

1. Show instruction and word limit.
2. Keep comfortable line height.
3. Display a small visible question number for every gap.
4. Allow controls to become block-level on mobile.
5. Render a clean word bank above the summary when shared options exist.
6. Respect `allow_option_reuse`.

Example word bank:

```text
A  erosion
B  underbrush
C  rainfall
D  migration
```

Do not hide used choices completely.

---

## 10.8 `matching_headings`

Present a `List of Headings` and one answer control per paragraph.

Requirements:

1. Show every heading with its Roman numeral.
2. Render each paragraph item with a dropdown.
3. Use labels such as `Paragraph A`, `Paragraph B`, and `Paragraph C`.
4. When reuse is not allowed, mark selected headings as used and disable them in other dropdowns.
5. Keep used headings visible in the heading list.
6. When reuse is allowed, keep every heading selectable.
7. On desktop, a two-column layout is allowed.
8. On mobile, place the heading list above the questions.

Drag-and-drop may be an optional enhancement, but an accessible dropdown must remain the default control.

---

## 10.9 `matching_features`

Present a shared list of people, organizations, theories, features, or entities.

Requirements:

1. Render the shared list from `shared_options` or structured `context`.
2. Show labels A, B, C, and so on clearly.
3. Render each statement with a dropdown.
4. Respect `allow_option_reuse`.
5. Do not require drag-and-drop.
6. Wrap long entity names correctly.
7. Keep the shared list above or beside the questions.

Example:

```text
List of People

A  Dr. Ahmed
B  Professor Liang
C  Maria Santos

21  Believes that the policy is too expensive.
    [ Select a person ]
```

---

## 10.10 `matching_information`

Match each statement to a passage paragraph label.

Requirements:

1. Show instruction and reuse rule.
2. Render each statement as a separate question row.
3. Use a dropdown containing paragraph labels such as A–H.
4. Derive choices from `source_paragraph_ids` or explicit passage paragraph labels.
5. Do not render whole passage paragraphs inside the question card.
6. Optionally expose a subtle `View paragraph C` action when the surrounding application supports passage navigation.

Store the paragraph label:

```ts
answers[question.question_id] = "C";
```

---

# 11. Attempt progress

Calculate per group:

```ts
answeredCount
totalQuestions
```

Rules:

- a text answer counts only when the trimmed value is non-empty;
- a single-choice answer counts when one option is selected;
- a multiple-choice answer counts only when the required number has been selected;
- a matching answer counts when a non-empty option is selected.

Display:

```text
3 of 5 answered
```

Do not place a large progress chart inside every group. A small text indicator or thin progress line is enough.

---

# 12. Validation behavior

Validation should help without interrupting the learner.

During normal answering:

- do not show errors merely because the learner moves to another question;
- enforce the maximum number of multi-select choices immediately;
- show word-limit guidance but do not delete words automatically;
- preserve all entered answers.

When submitting, highlight incomplete items and use concise messages:

```text
Choose two answers.
Select one option.
Enter an answer using no more than two words.
This question has not been answered.
```

---

# 13. Review presentation

Create a reusable feedback area below each reviewed question.

Example:

```text
Your answer: FALSE
Correct answer: TRUE

Evidence
“The average yearly temperature has risen by one degree Fahrenheit.”

Explanation
The statement directly matches the information in the passage.
```

Rules:

- show review details only after submission;
- preserve the user's original answer;
- clearly identify unanswered questions;
- render `evidence_quote` as a restrained quote block;
- render `explanation` as normal supporting text;
- do not expose `difficulty` or `skill` unless an educator mode explicitly requests them.

---

# 14. Empty and edge cases

Handle safely:

- empty context;
- empty shared options;
- long instructions;
- long option text;
- missing review metadata;
- questions with no options;
- unknown question types;
- malformed placeholders;
- missing question numbers;
- unanswered questions;
- repeated labels.

For an unknown type, render a safe fallback:

```text
This question type is not supported yet.
```

Do not crash the entire quiz.

---

# 15. Tailwind styling direction

Use a consistent token strategy rather than unrelated class combinations.

Example:

```ts
const ui = {
  page: "bg-slate-50 text-slate-900",
  surface: "rounded-xl border border-slate-200 bg-white",
  mutedSurface: "rounded-lg border border-slate-200 bg-slate-50",
  selected: "border-indigo-500 bg-indigo-50",
  mutedText: "text-slate-500",
  focus:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
};
```

Use one accent family consistently.

Do not add dark mode unless the surrounding application already requires it.

---

# 16. Implementation quality requirements

Use:

- strict TypeScript;
- controlled inputs;
- immutable answer updates;
- accessible semantic HTML;
- clear prop names;
- small reusable components;
- safe placeholder parsing;
- predictable state flow.

Avoid:

- unnecessary `any`;
- unsafe HTML injection;
- duplicate local and parent answer state;
- one giant renderer component;
- heavy UI libraries unless already installed;
- animation libraries for basic interactions;
- question-type-specific logic in unrelated components.

---

# 17. Expected deliverables

Produce:

1. TypeScript interfaces for quiz data and answer state.
2. `QuestionGroupRenderer`.
3. Shared UI controls.
4. One renderer component for every supported question type.
5. Mock data demonstrating every type.
6. A demo page showing all groups.
7. Attempt mode.
8. Review mode.
9. Responsive layouts.
10. Accessible keyboard interactions.
11. Clean production-quality Tailwind styling.

---

# 18. Final acceptance criteria

The completed UI must:

- make instructions immediately understandable;
- make question numbers easy to locate;
- make answer controls obvious;
- support long IELTS question text;
- keep reading and answering comfortable;
- avoid unnecessary color and decoration;
- work well with keyboard, mouse, and touch;
- remain consistent across all question types;
- reveal answers only after submission;
- look polished but not flashy;
- feel like a modern IELTS test application rather than a generic form builder.
