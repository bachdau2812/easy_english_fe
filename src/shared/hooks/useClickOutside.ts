import { RefObject, useEffect } from "react";

export const useClickOutside = <T extends HTMLElement>(
  ref: RefObject<T>,
  onClickOutside: () => void
): void => {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }

      onClickOutside();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClickOutside, ref]);
};
