import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getDownloadFilename,
  triggerBlobDownload
} from "../src/shared/api/fileDownload.ts";

const apiClientSource = readFileSync(
  new URL("../src/shared/api/apiClient.ts", import.meta.url),
  "utf8"
);

const vocabularyApiSource = readFileSync(
  new URL("../src/features/vocabulary/api/vocabularyApi.ts", import.meta.url),
  "utf8"
);

const pageSource = readFileSync(
  new URL("../src/features/vocabulary/pages/VocabularyExplorePage.tsx", import.meta.url),
  "utf8"
);

const cssSource = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

test("download filename supports UTF-8 and quoted content disposition values", () => {
  assert.equal(
    getDownloadFilename("attachment; filename*=UTF-8''my%20vocabulary.xlsx"),
    "my vocabulary.xlsx"
  );
  assert.equal(
    getDownloadFilename('attachment; filename="my-vocabulary.xlsx"'),
    "my-vocabulary.xlsx"
  );
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
    assert.equal(anchor.href, "blob:test");
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

test("api client downloads a successful response as Blob and preserves auth failures", () => {
  const downloadSource = apiClientSource.match(
    /const downloadFile = async[\s\S]*?export const apiClient/
  )?.[0] ?? "";

  assert.notEqual(downloadSource, "");
  assert.match(downloadSource, /headers\.set\("Authorization", `Bearer \$\{token\}`\)/);
  assert.match(downloadSource, /await response\.blob\(\)/);
  assert.match(
    downloadSource,
    /getDownloadFilename\(response\.headers\.get\("Content-Disposition"\)\)/
  );
  assert.match(downloadSource, /isUnauthenticatedResponse/);
  assert.match(downloadSource, /emitAuthRequired/);
});

test("vocabulary export requests Vietnamese Excel without userId", () => {
  const exportMethodSource = vocabularyApiSource.match(
    /exportSavedVocabularies\(langCode = "vi"\)[\s\S]*?\n  },/
  )?.[0] ?? "";

  assert.notEqual(exportMethodSource, "");
  assert.match(exportMethodSource, /apiClient\.download\("\/user-vocabularies\/export"/);
  assert.match(exportMethodSource, /query:\s*\{ langCode \}/);
  assert.doesNotMatch(exportMethodSource, /userId/);
});

test("My Vocabulary disables export while pending and reports download errors", () => {
  assert.match(pageSource, /const exportVocabulary = useMutation\(\{/);
  assert.match(pageSource, /vocabularyApi\.exportSavedVocabularies\("vi"\)/);
  assert.match(
    pageSource,
    /triggerBlobDownload\(blob, filename \?\? "my-vocabulary\.xlsx"\)/
  );
  assert.match(pageSource, /disabled=\{exportVocabulary\.isPending\}/);
  assert.match(pageSource, /onClick=\{\(\) => exportVocabulary\.mutate\(\)\}/);
  assert.match(
    pageSource,
    /exportVocabulary\.isPending \? "Exporting\.\.\." : "Export vocabulary"/
  );
  assert.match(pageSource, /getSafeErrorMessage\(exportVocabulary\.error\)/);
});

test("export action is centered after the complete level list", () => {
  assert.match(
    pageSource,
    /<div className="vocab-saved-level-list">[\s\S]*?<\/div>\s*<div className="vocab-saved-export">/
  );
  assert.match(
    cssSource,
    /\.vocab-saved-export\s*\{[\s\S]*?align-items:\s*center/
  );
});
