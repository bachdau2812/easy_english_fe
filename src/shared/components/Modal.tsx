import { ReactNode, useRef } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { Button } from "./Button";

interface ModalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export const Modal = ({ children, isOpen, onClose, title }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useClickOutside(modalRef, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal" ref={modalRef} role="dialog">
        <header className="topbar">
          <strong>{title}</strong>
          <Button aria-label="Close modal" onClick={onClose} variant="ghost">
            Close
          </Button>
        </header>
        {children}
      </section>
    </div>
  );
};
