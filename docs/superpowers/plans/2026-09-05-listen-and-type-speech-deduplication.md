# Listen and Type Speech Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure each finalized microphone transcript is inserted once and prevent concurrent speech-recognition sessions in Listen and Type.

**Architecture:** Put cumulative-result filtering in a pure helper inside the existing `listenAndType.ts` domain module. Keep browser lifecycle ownership in `ListeningDetailPage`, using the recognition ref as the synchronous single-session guard and clearing it on end, error, and unmount.

**Tech Stack:** React 18, TypeScript 5, Web Speech API, Node test runner, Vite.

## Global Constraints

- Process only results from `event.resultIndex` onward.
- Insert only non-empty results whose `isFinal` flag is true.
- Preserve legitimately repeated spoken words without text-based deduplication.
- Preserve text typed before starting the microphone.
- Allow only one active `SpeechRecognition` instance.
- Disable the microphone button while listening.
- Preserve the current `speechToTextLangCode` with `en-US` fallback.
- Preserve the existing unsupported-browser message and speech-fill animation.
- Preserve the user's unrelated `.gitignore` change.

---

## File Structure

- Modify `src/features/listening/listenAndType.ts`: define the minimal speech-result shape and pure final-transcript selector.
- Modify `src/features/listening/pages/ListeningDetailPage.tsx`: consume the helper and enforce one active recognition instance.
- Modify `tests/listenAndType.test.mts`: reproduce cumulative event duplication and assert lifecycle integration.

### Task 1: Deduplicate finalized speech and guard the recognition lifecycle

**Files:**
- Modify: `src/features/listening/listenAndType.ts`
- Modify: `src/features/listening/pages/ListeningDetailPage.tsx:27-38,334-346,509-546,718-727`
- Test: `tests/listenAndType.test.mts`

**Interfaces:**
- Produces: `SpeechRecognitionResultLike { 0?: { transcript?: string }; isFinal: boolean }`.
- Produces: `getNewFinalSpeechTranscript(results: ArrayLike<SpeechRecognitionResultLike>, resultIndex: number): string`.
- Consumes: the existing local `BrowserSpeechRecognition` lifecycle and React state.

- [ ] **Step 1: Write failing helper tests for cumulative, interim, and repeated speech**

Add the helper import and these tests:

```ts
test("speech input reads only newly finalized cumulative results", () => {
  const results = [
    { 0: { transcript: "hello" }, isFinal: true },
    { 0: { transcript: "world" }, isFinal: true }
  ];

  assert.equal(getNewFinalSpeechTranscript(results, 1), "world");
});

test("speech input ignores interim text and preserves intentional repeated words", () => {
  const results = [
    { 0: { transcript: "temporary guess" }, isFinal: false },
    { 0: { transcript: "very very good" }, isFinal: true }
  ];

  assert.equal(getNewFinalSpeechTranscript(results, 0), "very very good");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/listenAndType.test.mts`

Expected: FAIL because `getNewFinalSpeechTranscript` is not exported.

- [ ] **Step 3: Implement the minimal pure helper**

Add to `src/features/listening/listenAndType.ts`:

```ts
export interface SpeechRecognitionResultLike {
  0?: { transcript?: string };
  isFinal: boolean;
}

export const getNewFinalSpeechTranscript = (
  results: ArrayLike<SpeechRecognitionResultLike>,
  resultIndex: number
) =>
  Array.from(results)
    .slice(Math.max(resultIndex, 0))
    .filter((result) => result.isFinal)
    .map((result) => result[0]?.transcript?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
```

- [ ] **Step 4: Run the focused test and verify helper GREEN**

Run: `node --experimental-strip-types --test tests/listenAndType.test.mts`

Expected: all helper tests PASS.

- [ ] **Step 5: Write failing integration contract tests**

Add:

```ts
test("the lesson page consumes only new final speech results", () => {
  assert.match(listeningDetailPageSource, /resultIndex: number;/);
  assert.match(
    listeningDetailPageSource,
    /getNewFinalSpeechTranscript\(event\.results, event\.resultIndex\)/
  );
  assert.doesNotMatch(
    listeningDetailPageSource,
    /Array\.from\(event\.results\)[\s\S]*?\.join\(" "\)/
  );
});

test("the lesson page permits only one active microphone session", () => {
  assert.match(
    listeningDetailPageSource,
    /if \(speechRecognitionRef\.current\) \{\s*return;\s*\}/
  );
  assert.match(listeningDetailPageSource, /disabled=\{isListening\}/);
  assert.match(
    listeningDetailPageSource,
    /if \(speechRecognitionRef\.current === recognition\) \{\s*speechRecognitionRef\.current = null;\s*setIsListening\(false\);\s*\}/
  );
});
```

- [ ] **Step 6: Run the focused test and verify integration RED**

Run: `node --experimental-strip-types --test tests/listenAndType.test.mts`

Expected: helper tests PASS; integration tests FAIL because the page still processes all results and permits repeated starts.

- [ ] **Step 7: Update the recognition event and lifecycle**

Import `getNewFinalSpeechTranscript` and `SpeechRecognitionResultLike`. Change the event type to:

```ts
onresult: ((event: {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}) => void) | null;
```

At the start of `startSpeechInput`, add:

```ts
if (speechRecognitionRef.current) {
  return;
}
```

Replace cumulative result construction with:

```ts
const transcript = getNewFinalSpeechTranscript(event.results, event.resultIndex);
```

Replace end/error callbacks with:

```ts
const finishSpeechInput = () => {
  if (speechRecognitionRef.current === recognition) {
    speechRecognitionRef.current = null;
    setIsListening(false);
  }
};

recognition.onerror = finishSpeechInput;
recognition.onend = finishSpeechInput;
```

Change unmount cleanup to clear the ref before stopping:

```ts
const recognition = speechRecognitionRef.current;
speechRecognitionRef.current = null;
recognition?.stop();
```

Disable the microphone button:

```tsx
disabled={isListening}
```

- [ ] **Step 8: Run focused tests and verify GREEN**

Run: `node --experimental-strip-types --test tests/listenAndType.test.mts`

Expected: all Listen and Type tests PASS.

- [ ] **Step 9: Run complete verification**

Run: `npm.cmd test`

Expected: exit code 0 with no failing tests.

Run: `npm.cmd run build`

Expected: TypeScript and Vite finish with exit code 0.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 10: Commit the fix**

```powershell
git add src/features/listening/listenAndType.ts src/features/listening/pages/ListeningDetailPage.tsx tests/listenAndType.test.mts
git commit -m "Fix duplicated speech input"
```
