# Saved Vocabulary Excel Export Design

## Goal

Add a centered **Export vocabulary** button below Level 6 in the My Vocabulary level overview. The button downloads the authenticated user's saved vocabulary as `my-vocabulary.xlsx` in Vietnamese.

## API Contract

```http
GET /user-vocabularies/export?langCode=vi
Authorization: Bearer <token>
```

The response is an Excel file rather than the application's normal JSON envelope. The frontend must request it as a `Blob`. The user identity comes only from the bearer token; no `userId` query parameter is sent.

## Architecture

Extend the shared API client with a focused authenticated file-download method. It reuses the existing URL builder, bearer-token lookup, unauthenticated event, and safe API error behavior, while returning the raw `Blob` and optional filename from `Content-Disposition`.

Add `vocabularyApi.exportSavedVocabularies(langCode = "vi")` as the feature-level API boundary. `MyVocabularyPanel` owns the export mutation and browser download action; the level-list markup only renders the button and its state.

## Interaction and Layout

- Render the button immediately after the Level 1–6 list, within the level overview.
- Center it horizontally without changing the width or alignment of the level rows.
- The idle label is **Export vocabulary**.
- While the request is pending, disable the button and display **Exporting...**.
- On success, create a temporary object URL, trigger the browser download, and revoke the URL afterward.
- Prefer a valid server-provided filename; otherwise use `my-vocabulary.xlsx`.
- Always request `langCode=vi` for this screen.

## Error Handling

If the export fails, do not trigger a download. Display the existing safe error message style directly below the centered button. Authentication failures continue to use the application's global auth-required flow.

## Testing and Verification

Add focused regression coverage for:

- the export endpoint and `langCode=vi` query;
- authenticated Blob handling without JSON parsing;
- the centered button, idle/pending labels, disabled state, success download, and inline error;
- cleanup of the temporary object URL.

Verify the focused tests and run the production build.

## Success Criteria

- The button is centered directly below Level 6.
- One click makes one authenticated export request with `langCode=vi`.
- Repeated clicks are blocked while the request is pending.
- A successful response downloads `my-vocabulary.xlsx`.
- A failed response shows a safe message and downloads nothing.
- Existing My Vocabulary search and level navigation remain unchanged.
