# Saved Vocabulary Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centered My Vocabulary button that downloads the authenticated user's saved vocabulary from the new Excel export endpoint.

**Architecture:** Add a raw authenticated download path to the shared API client, with small reusable helpers for parsing filenames and triggering a browser Blob download. Expose that path through `vocabularyApi`, then let `MyVocabularyPanel` own the mutation, pending/error state, and download side effect.

**Tech Stack:** React 18, TypeScript 5, TanStack React Query, Fetch API, Vite, Node test runner.

## Global Constraints

- Endpoint: `GET /user-vocabularies/export?langCode=vi`.
- Authentication uses the existing bearer token; never send `userId` in the query.
- Idle label is exactly `Export vocabulary`; pending label is exactly `Exporting...`.
- The button is centered immediately below Level 6.
- Prefer a valid `Content-Disposition` filename and otherwise use `my-vocabulary.xlsx`.
- Do not alter saved-vocabulary search or level navigation behavior.
- Preserve the user's unrelated `.gitignore` change.

---

## File Structure

- Create `src/shared/api/fileDownload.ts`: pure filename parsing plus the browser Blob-download side effect.
- Modify `src/shared/api/apiClient.ts`: add an authenticated raw-file GET method that bypasses JSON parsing on success and preserves existing auth/error behavior.
- Modify `src/features/vocabulary/api/vocabularyApi.ts`: expose `exportSavedVocabularies(langCode = "vi")`.
- Modify `src/features/vocabulary/pages/VocabularyExplorePage.tsx`: add the export mutation and render pending/error states.
- Modify `src/index.css`: center and style the export action below the level list.
- Create `tests/vocabularyExport.test.mts`: cover filename parsing, object-URL cleanup, API wiring, UI state, and placement/style contracts.

### Task 1: Shared authenticated file download

**Files:**
- Create: `src/shared/api/fileDownload.ts`
- Modify: `src/shared/api/apiClient.ts`
- Test: `tests/vocabularyExport.test.mts`

**Interfaces:**
- Produces: `DownloadFileResponse { blob: Blob; filename: string | null }`.
- Produces: `getDownloadFilename(contentDisposition: string | null): string | null`.
- Produces: `triggerBlobDownload(blob: Blob, filename: string): void`.
- Produces: `apiClient.download(path: string, options?: RequestOptions): Promise<DownloadFileResponse>`.

- [ ] **Step 1: Write failing tests for filename parsing and Blob cleanup**

```ts
test("download filename supports UTF-8 and quoted content disposition values", () => {
  assert.equal(
    getDownloadFilename("attachment; filename*=UTF-8''my%20vocabulary.xlsx"),
    "my vocabulary.xlsx"
  );
  assert.equal(getDownloadFilename('attachment; filename="my-vocabulary.xlsx"'), "my-vocabulary.xlsx");
  assert.equal(getDownloadFilename(null), null);
});

test("browser download always revokes its temporary object URL", () => {
  const calls: string[] = [];
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalDocument = globalThis.document;
  const anchor = { click: () => calls.push("click"), download: "", href: "" };

  URL.createObjectURL = () => {
    calls.push("create");
    return "blob:test";
  };
  URL.revokeObjectURL = (value) => calls.push(`revoke:${value}`);
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { createElement: () => anchor }
  });

  try {
    triggerBlobDownload(new Blob(), "my-vocabulary.xlsx");
    assert.equal(anchor.download, "my-vocabulary.xlsx");
    assert.deepEqual(calls, ["create", "click", "revoke:blob:test"]);
  } finally {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument
    });
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/vocabularyExport.test.mts`

Expected: FAIL because `src/shared/api/fileDownload.ts` does not exist.

- [ ] **Step 3: Implement the file helpers**

```ts
export interface DownloadFileResponse {
  blob: Blob;
  filename: string | null;
}

export const getDownloadFilename = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) return null;
  const utf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return decodeURIComponent(utf8); } catch { return null; }
  }
  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim() ?? null;
};

export const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
```

- [ ] **Step 4: Add a source-contract test for raw authenticated downloads**

```ts
test("api client downloads a successful response as Blob and preserves auth failures", () => {
  assert.match(apiClientSource, /headers\.set\("Authorization", `Bearer \$\{token\}`\)/);
  assert.match(apiClientSource, /await response\.blob\(\)/);
  assert.match(apiClientSource, /getDownloadFilename\(response\.headers\.get\("Content-Disposition"\)\)/);
  assert.match(apiClientSource, /isUnauthenticatedResponse/);
  assert.match(apiClientSource, /emitAuthRequired/);
});
```

- [ ] **Step 5: Run the focused test and verify the new contract is RED**

Run: `node --experimental-strip-types --test tests/vocabularyExport.test.mts`

Expected: filename/helper tests PASS; API-client contract FAIL because `apiClient.download` is missing.

- [ ] **Step 6: Implement `apiClient.download`**

Add an internal download function that parses the existing JSON error envelope only for non-success responses and otherwise returns the raw file:

```ts
const downloadFile = async (
  path: string,
  options: RequestOptions = {}
): Promise<DownloadFileResponse> => {
  const headers = new Headers(options.headers);
  const token = authTokenStorage.get();

  headers.set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    body: undefined,
    headers,
    method: "GET"
  });

  if (!response.ok) {
    const payload = await parseResponseBody<never>(response);
    const error = new ApiError(payload?.message ?? "The request could not be completed.", {
      status: response.status,
      code: payload?.code,
      traceId: payload?.traceId
    });
    if (isUnauthenticatedResponse(response.status, payload?.code)) {
      emitAuthRequired(error);
    }
    throw error;
  }

return {
  blob: await response.blob(),
  filename: getDownloadFilename(response.headers.get("Content-Disposition"))
};
};
```

Expose it as:

```ts
download(path: string, options?: RequestOptions) {
  return downloadFile(path, options);
}
```

- [ ] **Step 7: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/vocabularyExport.test.mts`

Expected: all Task 1 tests PASS.

- [ ] **Step 8: Commit Task 1**

```powershell
git add src/shared/api/fileDownload.ts src/shared/api/apiClient.ts tests/vocabularyExport.test.mts
git commit -m "Add authenticated file download support"
```

### Task 2: Vocabulary export API and centered UI action

**Files:**
- Modify: `src/features/vocabulary/api/vocabularyApi.ts`
- Modify: `src/features/vocabulary/pages/VocabularyExplorePage.tsx`
- Modify: `src/index.css`
- Test: `tests/vocabularyExport.test.mts`

**Interfaces:**
- Consumes: `apiClient.download` and `triggerBlobDownload` from Task 1.
- Produces: `vocabularyApi.exportSavedVocabularies(langCode = "vi")`.

- [ ] **Step 1: Write failing API and UI contract tests**

```ts
test("vocabulary export requests Vietnamese Excel without userId", () => {
  assert.match(vocabularyApiSource, /exportSavedVocabularies\(langCode = "vi"\)/);
  assert.match(vocabularyApiSource, /apiClient\.download\("\/user-vocabularies\/export"/);
  assert.match(vocabularyApiSource, /query:\s*\{ langCode \}/);
  assert.doesNotMatch(exportMethodSource, /userId/);
});

test("My Vocabulary exports once, disables while pending, and reports errors", () => {
  assert.match(pageSource, /const exportVocabulary = useMutation/);
  assert.match(pageSource, /vocabularyApi\.exportSavedVocabularies\("vi"\)/);
  assert.match(pageSource, /triggerBlobDownload\(blob, filename \?\? "my-vocabulary\.xlsx"\)/);
  assert.match(pageSource, /disabled=\{exportVocabulary\.isPending\}/);
  assert.match(pageSource, /exportVocabulary\.isPending \? "Exporting\.\.\." : "Export vocabulary"/);
  assert.match(pageSource, /getSafeErrorMessage\(exportVocabulary\.error\)/);
});

test("export action is centered after the complete level list", () => {
  assert.match(pageSource, /<div className="vocab-saved-level-list">[\s\S]*?<\/div>\s*<div className="vocab-saved-export">/);
  assert.match(cssSource, /\.vocab-saved-export\s*\{[\s\S]*?align-items:\s*center/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/vocabularyExport.test.mts`

Expected: FAIL because the feature API, mutation, button, and styles do not exist.

- [ ] **Step 3: Add the feature API method**

```ts
exportSavedVocabularies(langCode = "vi") {
  return apiClient.download("/user-vocabularies/export", {
    query: { langCode }
  });
},
```

- [ ] **Step 4: Add the export mutation and browser download**

Import `triggerBlobDownload`, then add inside `MyVocabularyPanel`:

```ts
const exportVocabulary = useMutation({
  mutationFn: () => vocabularyApi.exportSavedVocabularies("vi"),
  onSuccess: ({ blob, filename }) => {
    triggerBlobDownload(blob, filename ?? "my-vocabulary.xlsx");
  }
});
```

Immediately after `.vocab-saved-level-list`, render:

```tsx
<div className="vocab-saved-export">
  <button
    disabled={exportVocabulary.isPending}
    onClick={() => exportVocabulary.mutate()}
    type="button"
  >
    {exportVocabulary.isPending ? "Exporting..." : "Export vocabulary"}
  </button>
  {exportVocabulary.error ? (
    <p className="vocab-saved-inline-state vocab-saved-inline-state--error">
      {getSafeErrorMessage(exportVocabulary.error)}
    </p>
  ) : null}
</div>
```

- [ ] **Step 5: Center and style the export action**

```css
.vocab-saved-export {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}

.vocab-saved-export > button {
  background: #2563eb;
  border: 0;
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  min-height: 44px;
  padding: 0 20px;
}

.vocab-saved-export > button:disabled {
  cursor: wait;
  opacity: 0.65;
}
```

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `node --experimental-strip-types --test tests/vocabularyExport.test.mts`

Expected: all export tests PASS.

- [ ] **Step 7: Run production verification**

Run: `npm.cmd run build`

Expected: TypeScript and Vite finish with exit code 0.

Run: `git diff --check`

Expected: exit code 0 with no whitespace errors.

- [ ] **Step 8: Commit Task 2**

```powershell
git add src/features/vocabulary/api/vocabularyApi.ts src/features/vocabulary/pages/VocabularyExplorePage.tsx src/index.css tests/vocabularyExport.test.mts
git commit -m "Add saved vocabulary Excel export"
```
