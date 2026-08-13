import { useRef } from "react";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { WordResponse } from "../../dictionary/types";
import { HomeIcon } from "./HomeIcon";
import { HomeWordResults } from "./HomeWordResults";

interface HomeWordDetailModalProps {
  onClose: () => void;
  onRequireAuth: () => void;
  word?: WordResponse | null;
  words?: WordResponse[];
}

export const HomeWordDetailModal = ({ onClose, onRequireAuth, word, words }: HomeWordDetailModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const resultWords = words?.length ? words : word ? [word] : [];

  useClickOutside(modalRef, onClose);

  if (resultWords.length === 0) {
    return null;
  }

  return (
    <div className="home-word-modal-backdrop" role="presentation">
      <section aria-modal="true" className="home-word-modal" ref={modalRef} role="dialog">
        <button
          aria-label="Close word detail"
          className="home-auth-modal__close"
          onClick={onClose}
          type="button"
        >
          <HomeIcon name="close" size={20} />
        </button>
        <HomeWordResults onRequireAuth={onRequireAuth} words={resultWords} />
      </section>
    </div>
  );
};
