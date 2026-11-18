import { useCallback, useEffect, useRef, useState } from "react";
import { vocabularyApi } from "../../vocabulary/api/vocabularyApi";
import type { AllUserVocabularyResponse } from "../../vocabulary/types";
import {
  calculateAllVocabularyReviewResult,
  createAllVocabularyReviewSession,
  setAllVocabularyPracticeMode,
  shuffleAllVocabularyOrder
} from "../allVocabularyReview";
import type {
  AllVocabularyColumnKey,
  AllVocabularyPracticeMode,
  AllVocabularyReviewSession
} from "../allVocabularyReview";
import {
  deleteAllVocabularyReviewSession,
  getAllVocabularyReviewSession,
  saveAllVocabularyReviewSession
} from "../allVocabularySessionStore";

export type AllVocabularyReviewStage =
  | "checking"
  | "resume-choice"
  | "loading"
  | "active"
  | "submitted"
  | "empty"
  | "error";

export const useAllVocabularyReviewSession = (userId: string) => {
  const [stage, setStage] = useState<AllVocabularyReviewStage>("checking");
  const [session, setSession] = useState<AllVocabularyReviewSession | null>(null);
  const [savedSession, setSavedSession] = useState<AllVocabularyReviewSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const sessionRef = useRef<AllVocabularyReviewSession | null>(null);
  const requestIdRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistSession = useCallback(async (nextSession: AllVocabularyReviewSession) => {
    try {
      await saveAllVocabularyReviewSession(nextSession);
      setSaveError(null);
    } catch (saveFailure) {
      setSaveError(
        saveFailure instanceof Error
          ? saveFailure.message
          : "Could not save this session on this device."
      );
    }
  }, []);

  const scheduleSave = useCallback((nextSession: AllVocabularyReviewSession) => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void persistSession(nextSession);
    }, 250);
  }, [persistSession]);

  const startNewSession = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStage("loading");
    setError(null);
    setSaveError(null);

    try {
      const items: AllUserVocabularyResponse[] = await vocabularyApi.getAllUserVocabularies("vi");
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (items.length === 0) {
        await deleteAllVocabularyReviewSession(userId);
        setSavedSession(null);
        sessionRef.current = null;
        setSession(null);
        setStage("empty");
        return;
      }

      const nextSession = createAllVocabularyReviewSession(userId, items);
      await saveAllVocabularyReviewSession(nextSession);
      if (requestId !== requestIdRef.current) {
        return;
      }

      sessionRef.current = nextSession;
      setSession(nextSession);
      setSavedSession(null);
      setStage("active");
    } catch (failure) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(failure instanceof Error ? failure.message : "Could not start an All review session.");
      setStage("error");
    }
  }, [userId]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStage("checking");
    setSession(null);
    setSavedSession(null);
    setError(null);
    setSaveError(null);
    sessionRef.current = null;

    void getAllVocabularyReviewSession(userId)
      .then((storedSession) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!storedSession) {
          return startNewSession();
        }

        if (storedSession.userId !== userId || !Array.isArray(storedSession.items)) {
          return deleteAllVocabularyReviewSession(userId).then(() => startNewSession());
        }

        setSavedSession(storedSession);
        if (storedSession.status === "submitted" && storedSession.result) {
          sessionRef.current = storedSession;
          setSession(storedSession);
          setStage("submitted");
          return;
        }

        setStage("resume-choice");
      })
      .catch((failure: unknown) => {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(failure instanceof Error ? failure.message : "Could not read the saved review session.");
        setStage("error");
      });

    return () => {
      requestIdRef.current += 1;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        if (sessionRef.current?.status === "draft") {
          void persistSession(sessionRef.current);
        }
      }
    };
  }, [persistSession, startNewSession, userId]);

  useEffect(() => {
    const saveBeforePageHide = () => {
      const currentSession = sessionRef.current;
      if (currentSession?.status === "draft") {
        void persistSession(currentSession);
      }
    };

    window.addEventListener("pagehide", saveBeforePageHide);
    return () => window.removeEventListener("pagehide", saveBeforePageHide);
  }, [persistSession]);

  const continueSavedSession = useCallback(() => {
    if (!savedSession) {
      return;
    }

    sessionRef.current = savedSession;
    setSession(savedSession);
    setError(null);
    setStage(savedSession.status === "submitted" ? "submitted" : "active");
  }, [savedSession]);

  const updateSession = useCallback(
    (update: (current: AllVocabularyReviewSession) => AllVocabularyReviewSession) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.status !== "draft") {
        return;
      }

      const nextSession = {
        ...update(currentSession),
        updatedAt: new Date().toISOString()
      };
      sessionRef.current = nextSession;
      setSession(nextSession);
      scheduleSave(nextSession);
    },
    [scheduleSave]
  );

  const setAnswer = useCallback(
    (localId: string, column: "meaning_practice" | "word_practice", value: string) => {
      updateSession((current) => ({
        ...current,
        answers: {
          ...current.answers,
          [localId]: {
            ...current.answers[localId],
            [column]: value
          }
        }
      }));
    },
    [updateSession]
  );

  const setMode = useCallback(
    (mode: AllVocabularyPracticeMode) => {
      updateSession((current) => setAllVocabularyPracticeMode(current, mode));
    },
    [updateSession]
  );

  const toggleColumn = useCallback(
    (column: AllVocabularyColumnKey) => {
      updateSession((current) => ({
        ...current,
        visibleColumns: {
          ...current.visibleColumns,
          [column]: !current.visibleColumns[column]
        }
      }));
    },
    [updateSession]
  );

  const shuffleOrder = useCallback(() => {
    updateSession((current) => ({
      ...current,
      order: shuffleAllVocabularyOrder(current.order)
    }));
  }, [updateSession]);

  const submitSession = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "draft") {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const nextSession: AllVocabularyReviewSession = {
      ...currentSession,
      status: "submitted",
      result: calculateAllVocabularyReviewResult(currentSession),
      updatedAt: new Date().toISOString()
    };
    sessionRef.current = nextSession;
    setSession(nextSession);
    setStage("submitted");
    void persistSession(nextSession);
  }, [persistSession]);

  const retrySave = useCallback(() => {
    const currentSession = sessionRef.current;
    if (currentSession) {
      void persistSession(currentSession);
    }
  }, [persistSession]);

  return {
    continueSavedSession,
    error,
    retrySave,
    saveError,
    savedSession,
    session,
    setAnswer,
    setMode,
    shuffleOrder,
    stage,
    startNewSession,
    submitSession,
    toggleColumn
  };
};
