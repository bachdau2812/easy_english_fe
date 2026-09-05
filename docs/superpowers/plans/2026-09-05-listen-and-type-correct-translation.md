# Listen and Type Correct Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display each challenge's optional Vietnamese translation in the existing Correct popup.

**Architecture:** Extend the existing challenge response type and derive one trimmed `currentTranslation` value beside the current solution. Render a conditional, dedicated translation block in the popup without adding state, requests, or submit dependencies.

**Tech Stack:** React 18, TypeScript 5, CSS, Node test runner, Vite.

## Global Constraints

- Model `translate` as `translate?: string | null`.
- Use `currentChallenge.translate` from the lesson-detail response.
- Show the exact label `Vietnamese meaning`.
- Hide the entire translation section for missing, null, empty, or whitespace-only values.
- Use the same font family, font size, and line height as the English answer.
- Do not wait for the attempt submission or add another API call.
- Preserve answer matching, popup timing, and Continue navigation.
- Preserve the user's unrelated `.gitignore` change.

---

## File Structure

- Modify `src/features/listening/types.ts`: declare the nullable challenge translation field.
- Modify `src/features/listening/pages/ListeningDetailPage.tsx`: derive and conditionally render the translation.
- Modify `src/index.css`: add distinct translation label/body styling.
- Modify `tests/listenAndType.test.mts`: enforce the response and popup presentation contracts.

### Task 1: Render the optional challenge translation

**Files:**
- Modify: `src/features/listening/types.ts:38-49`
- Modify: `src/features/listening/pages/ListeningDetailPage.tsx:286-289,881-891`
- Modify: `src/index.css:6509-6569`
- Test: `tests/listenAndType.test.mts`

**Interfaces:**
- Consumes: `ListenAndTypeChallengeResponse.translate?: string | null`.
- Produces: `currentTranslation: string`, empty when no visible translation exists.
- Produces: `.listen-correct-popup__translation` presentation block.

- [ ] **Step 1: Write failing response and popup tests**

Read `types.ts` and `index.css` alongside the existing page source, then add:

```ts
test("listen challenges expose an optional nullable translation", () => {
  const challengeContract = listeningTypesSource.match(
    /export interface ListenAndTypeChallengeResponse\s*\{[\s\S]*?\n\}/
  )?.[0] ?? "";

  assert.match(challengeContract, /translate\?: string \| null;/);
});

test("the Correct popup conditionally shows the trimmed Vietnamese meaning", () => {
  assert.match(
    listeningDetailPageSource,
    /const currentTranslation = currentChallenge\?\.translate\?\.trim\(\) \?\? "";/
  );
  assert.match(
    listeningDetailPageSource,
    /\{currentTranslation \? \([\s\S]*?className="listen-correct-popup__translation"[\s\S]*?<small>Vietnamese meaning<\/small>[\s\S]*?<p>\{currentTranslation\}<\/p>[\s\S]*?\) : null\}/
  );
});

test("the Vietnamese meaning has dedicated secondary styling", () => {
  assert.match(
    cssSource,
    /\.listen-correct-popup__translation\s*\{[\s\S]*?width:\s*100%/
  );
  assert.match(cssSource, /\.listen-correct-popup__translation small\s*\{/);
  assert.match(cssSource, /\.listen-correct-popup__translation p\s*\{/);
});

test("the Vietnamese meaning inherits the English answer typography", () => {
  const translationBodyStyle = cssSource.match(
    /\.listen-correct-popup__translation p\s*\{[\s\S]*?\n\}/
  )?.[0] ?? "";

  assert.doesNotMatch(translationBodyStyle, /font-family|font-size|line-height/);
  assert.match(
    cssSource,
    /\.listen-correct-popup p\s*\{[\s\S]*?font-size:\s*clamp\([\s\S]*?line-height:\s*1\.55/
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/listenAndType.test.mts`

Expected: three new tests FAIL because the response field, popup block, and styles do not exist.

- [ ] **Step 3: Extend the response contract**

Add inside `ListenAndTypeChallengeResponse`:

```ts
translate?: string | null;
```

- [ ] **Step 4: Derive and render the optional meaning**

Beside `currentSolution`, add:

```ts
const currentTranslation = currentChallenge?.translate?.trim() ?? "";
```

Immediately after the existing answer paragraph in the Correct popup, add:

```tsx
{currentTranslation ? (
  <div className="listen-correct-popup__translation">
    <small>Vietnamese meaning</small>
    <p>{currentTranslation}</p>
  </div>
) : null}
```

- [ ] **Step 5: Add secondary translation styling**

Add after the existing Correct popup paragraph rule:

```css
.listen-correct-popup__translation {
  display: grid;
  gap: 6px;
  text-align: left;
  width: 100%;
}

.listen-correct-popup__translation small {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.listen-correct-popup__translation p {
  background: #f8fafc;
  color: #475569;
}
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/listenAndType.test.mts`

Expected: all Listen and Type tests PASS.

- [ ] **Step 7: Run complete verification**

Run: `npm.cmd test`

Expected: exit code 0 with no failing tests.

Run: `npm.cmd run build`

Expected: TypeScript and Vite finish with exit code 0.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 8: Commit**

```powershell
git add src/features/listening/types.ts src/features/listening/pages/ListeningDetailPage.tsx src/index.css tests/listenAndType.test.mts
git commit -m "Show Vietnamese meaning after dictation"
```
