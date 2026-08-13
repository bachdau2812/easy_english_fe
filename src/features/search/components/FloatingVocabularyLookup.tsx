import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState
} from "react";
import { useMutation } from "@tanstack/react-query";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { normalizeSearchText } from "../../../shared/utils/normalize";
import { dictionaryApi } from "../../dictionary/api/dictionaryApi";
import type { Word, WordResponse } from "../../dictionary/types";
import { HomeIcon } from "../../home/components/HomeIcon";
import { HomeWordDetailModal } from "../../home/components/HomeWordDetailModal";
import { searchApi } from "../api/searchApi";
import {
  clampFloatingLookupPosition,
  getFloatingLookupDefaultPosition,
  selectFloatingLookupResults,
  type FloatingLookupPosition
} from "../floatingVocabularyLookup";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { useRecordSearchHistory } from "../hooks/useRecordSearchHistory";

interface FloatingVocabularyLookupProps {
  anchorRef: RefObject<HTMLElement>;
  languageCode?: string;
  onRequireAuth: () => void;
  userId?: string | null;
}

interface FloatingLookupDragState {
  moved: boolean;
  originLeft: number;
  originTop: number;
  startX: number;
  startY: number;
}

interface FloatingLookupRequest {
  isAllMeanings: boolean;
  text: string;
  word?: Word;
}

const COLLAPSED_LOOKUP_SIZE = { height: 48, width: 48 };
const EXPANDED_LOOKUP_WIDTH = 440;

export const FloatingVocabularyLookup = ({
  anchorRef,
  languageCode = "vi",
  onRequireAuth,
  userId
}: FloatingVocabularyLookupProps) => {
  const lookupRef = useRef<HTMLFormElement>(null);
  const dragRef = useRef<FloatingLookupDragState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAllMeanings, setIsAllMeanings] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [position, setPosition] = useState<FloatingLookupPosition>({ left: 0, top: 0 });
  const [searchText, setSearchText] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [modalWords, setModalWords] = useState<WordResponse[]>([]);
  const recordSearchHistory = useRecordSearchHistory(userId);
  const autocomplete = useAutocomplete(searchText, isAllMeanings);
  const lookupWord = useMutation({
    mutationFn: async ({ isAllMeanings: requestAllMeanings, text, word }: FloatingLookupRequest) => {
      const normalizedText = normalizeSearchText(text || word?.normalizedWord || word?.word || "");

      if (!normalizedText) {
        throw new Error("Please enter a word to search.");
      }

      if (!requestAllMeanings && word?.id) {
        const detail = await dictionaryApi.getWordDetail({
          wordId: word.id,
          isTrans: true,
          transLangCode: languageCode
        });

        return [detail];
      }

      const results = await searchApi.fullSearch(normalizedText, languageCode);
      const selectedResults = selectFloatingLookupResults(results, requestAllMeanings);

      if (selectedResults.length === 0) {
        throw new Error("No dictionary detail was found for this word.");
      }

      return selectedResults;
    },
    onMutate: () => {
      setModalWords([]);
      setValidationMessage(null);
    },
    onSuccess: (words) => {
      setModalWords(words);
      recordSearchHistory(words);
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updatePosition = () => {
      const viewport = { height: window.innerHeight, width: window.innerWidth };
      const expandedWidth = Math.min(EXPANDED_LOOKUP_WIDTH, Math.max(48, viewport.width - 24));
      const renderedSize = isOpen
        ? { height: COLLAPSED_LOOKUP_SIZE.height, width: expandedWidth }
        : COLLAPSED_LOOKUP_SIZE;

      setPosition((current) => {
        if (hasMoved) {
          return clampFloatingLookupPosition(current, viewport, renderedSize);
        }

        const anchorRect = anchorRef.current?.getBoundingClientRect();
        const defaultPosition = anchorRect
          ? getFloatingLookupDefaultPosition(anchorRect, viewport)
          : { left: viewport.width - 96, top: 118 };

        return clampFloatingLookupPosition(defaultPosition, viewport, renderedSize);
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);

    return () => window.removeEventListener("resize", updatePosition);
  }, [anchorRef, hasMoved, isOpen]);

  const openWord = (text: string, word?: Word) => {
    const normalizedText = normalizeSearchText(text || word?.normalizedWord || word?.word || "");

    if (!normalizedText) {
      setValidationMessage("Please enter a word to search.");
      return;
    }

    setValidationMessage(null);
    lookupWord.mutate({ isAllMeanings, text: normalizedText, word });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    openWord(searchText);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isOpen || !lookupRef.current) {
      return;
    }

    event.preventDefault();
    const rect = lookupRef.current.getBoundingClientRect();

    dragRef.current = {
      moved: false,
      originLeft: rect.left,
      originTop: rect.top,
      startX: event.clientX,
      startY: event.clientY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragRef.current;

    if (!dragState || isOpen || typeof window === "undefined") {
      return;
    }

    const moved =
      Math.abs(event.clientX - dragState.startX) > 4 ||
      Math.abs(event.clientY - dragState.startY) > 4;

    dragRef.current = { ...dragState, moved };

    if (moved) {
      setHasMoved(true);
    }

    setPosition(
      clampFloatingLookupPosition(
        {
          left: dragState.originLeft + event.clientX - dragState.startX,
          top: dragState.originTop + event.clientY - dragState.startY
        },
        { height: window.innerHeight, width: window.innerWidth }
      )
    );
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragRef.current;

    if (!dragState || isOpen) {
      return;
    }

    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!dragState.moved) {
      setIsOpen(true);
    }
  };

  const closeLookup = () => {
    setIsOpen(false);
    setSearchText("");
    setValidationMessage(null);
    lookupWord.reset();
  };

  const suggestions = autocomplete.data ?? [];
  const searchError = validationMessage ?? (lookupWord.error ? getSafeErrorMessage(lookupWord.error) : null);
  const showSuggestions = Boolean(isOpen && (searchText.trim() || lookupWord.isPending || searchError));
  const style: CSSProperties = position;

  return (
    <>
      <form
        className={`floating-vocab-lookup ${isOpen ? "floating-vocab-lookup--open" : ""}`}
        onSubmit={handleSubmit}
        ref={lookupRef}
        style={style}
      >
        <button
          aria-label="Open vocabulary lookup"
          className="floating-vocab-lookup__icon"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          type="button"
        >
          <HomeIcon name="search" size={19} />
        </button>
        <input
          aria-label="Lookup vocabulary"
          onChange={(event) => {
            setSearchText(event.target.value);
            setValidationMessage(null);
            lookupWord.reset();
          }}
          placeholder="Search word"
          value={searchText}
        />
        {isOpen ? (
          <button
            aria-pressed={isAllMeanings}
            className={`floating-vocab-lookup__mode ${isAllMeanings ? "is-active" : ""}`}
            onClick={() => {
              setIsAllMeanings((current) => !current);
              setValidationMessage(null);
              lookupWord.reset();
            }}
            type="button"
          >
            <span aria-hidden="true" />
            All meanings
          </button>
        ) : null}
        {isOpen ? (
          <button
            aria-label="Close vocabulary lookup"
            className="floating-vocab-lookup__close"
            onClick={closeLookup}
            type="button"
          >
            <HomeIcon name="close" size={16} />
          </button>
        ) : null}

        {showSuggestions ? (
          <div className="floating-vocab-lookup__suggestions">
            {lookupWord.isPending ? <p>Loading word details...</p> : null}
            {!lookupWord.isPending && searchError ? <p>{searchError}</p> : null}
            {!lookupWord.isPending && !searchError && autocomplete.isLoading ? <p>Looking for matches...</p> : null}
            {!lookupWord.isPending && !searchError && autocomplete.error ? (
              <p>{getSafeErrorMessage(autocomplete.error)}</p>
            ) : null}
            {!lookupWord.isPending &&
            !searchError &&
            !autocomplete.isLoading &&
            !autocomplete.error &&
            suggestions.length === 0 ? (
              <p>No suggestions yet.</p>
            ) : null}
            {!lookupWord.isPending && !searchError && !autocomplete.isLoading && !autocomplete.error
              ? suggestions.slice(0, 7).map((word) => (
                  <button
                    key={word.id ?? word.word ?? word.normalizedWord}
                    onClick={() => {
                      const nextText = word.word ?? word.normalizedWord ?? "";
                      setSearchText(nextText);
                      openWord(nextText, word);
                    }}
                    type="button"
                  >
                    <span>{word.word ?? word.normalizedWord ?? "Untitled word"}</span>
                    <small>{[word.pos, word.certLevel].filter(Boolean).join(" / ") || "Word"}</small>
                  </button>
                ))
              : null}
          </div>
        ) : null}
      </form>

      <HomeWordDetailModal
        onClose={() => {
          setModalWords([]);
          lookupWord.reset();
        }}
        onRequireAuth={onRequireAuth}
        words={modalWords}
      />
    </>
  );
};
