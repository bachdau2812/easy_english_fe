import { useRef } from "react";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { WordResponse } from "../../dictionary/types";
import { HomeIcon } from "./HomeIcon";
import { HomeWordResult } from "./HomeWordResult";

interface HomeWordDetailModalProps {
  onClose: () => void;
  onRequireAuth: () => void;
  word: WordResponse | null;
}

export const HomeWordDetailModal = ({ onClose, onRequireAuth, word }: HomeWordDetailModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, onClose);

  if (!word) {
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
        <HomeWordResult onRequireAuth={onRequireAuth} word={word} />
      </section>
    </div>
  );
};
