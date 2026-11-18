import type { AllVocabularyReviewSession } from "./allVocabularyReview";

const DATABASE_NAME = "vocab-app-local";
const DATABASE_VERSION = 1;
const SESSION_STORE = "all-vocabulary-review-sessions";

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Local session storage is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SESSION_STORE)) {
        database.createObjectStore(SESSION_STORE, { keyPath: "userId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local session storage."));
    request.onblocked = () => reject(new Error("Local session storage is blocked by another tab."));
  });

export const getAllVocabularyReviewSession = async (
  userId: string
): Promise<AllVocabularyReviewSession | null> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SESSION_STORE, "readonly");
    const request = transaction.objectStore(SESSION_STORE).get(userId);

    request.onsuccess = () => resolve((request.result as AllVocabularyReviewSession | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the saved review session."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not read the saved review session."));
  });
};

export const saveAllVocabularyReviewSession = async (
  session: AllVocabularyReviewSession
): Promise<void> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SESSION_STORE, "readwrite");
    transaction.objectStore(SESSION_STORE).put(session);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the review session."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save the review session."));
  });
};

export const deleteAllVocabularyReviewSession = async (userId: string): Promise<void> => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SESSION_STORE, "readwrite");
    transaction.objectStore(SESSION_STORE).delete(userId);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear the saved review session."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not clear the saved review session."));
  });
};
