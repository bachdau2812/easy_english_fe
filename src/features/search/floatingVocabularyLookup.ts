export interface FloatingLookupPosition {
  left: number;
  top: number;
}

export interface FloatingLookupSize {
  height: number;
  width: number;
}

export interface FloatingLookupViewport {
  height: number;
  width: number;
}

export interface FloatingLookupAnchor {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export const FLOATING_LOOKUP_MARGIN = 12;

const COLLAPSED_LOOKUP_SIZE: FloatingLookupSize = { height: 48, width: 48 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const clampFloatingLookupPosition = (
  position: FloatingLookupPosition,
  viewport: FloatingLookupViewport,
  size: FloatingLookupSize = COLLAPSED_LOOKUP_SIZE
): FloatingLookupPosition => ({
  left: clamp(
    position.left,
    FLOATING_LOOKUP_MARGIN,
    viewport.width - size.width - FLOATING_LOOKUP_MARGIN
  ),
  top: clamp(
    position.top,
    FLOATING_LOOKUP_MARGIN,
    viewport.height - size.height - FLOATING_LOOKUP_MARGIN
  )
});

export const getFloatingLookupDefaultPosition = (
  anchor: FloatingLookupAnchor,
  viewport: FloatingLookupViewport,
  size: FloatingLookupSize = COLLAPSED_LOOKUP_SIZE
) =>
  clampFloatingLookupPosition(
    {
      left: anchor.right - size.width - 16,
      top: anchor.top + 18
    },
    viewport,
    size
  );

export const selectFloatingLookupResults = <T extends { otherSource?: string | null }>(
  results: T[],
  isAllMeanings: boolean
): T[] => {
  if (isAllMeanings) {
    return results;
  }

  const preferredResult =
    results.find((item) => item.otherSource?.toUpperCase() === "MOCHI") ?? results[0];

  return preferredResult ? [preferredResult] : [];
};
