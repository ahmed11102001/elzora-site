// Shared map geometry (viewBox 0 0 760 720): used by the static outline and the animated map.
export const MAP_VIEWBOX = "0 0 760 720";

export const EGYPT_PATH =
  "M27 23L153 38L312 49L342 32L426 28L456 44L573 46L612 168L597 245L573 290L534 245L498 196L474 137L459 161L477 196L504 248L546 326L555 361L612 476L648 560L732 679L732 693L18 693Z";
export const NILE_MAIN =
  "M414 668L492 546L490 486L477 434L481 402C440 380 410 350 388 331L363 266L384 198L386 133L393 121";
export const NILE_BRANCHES = ["M393 121C380 90 350 60 342 32", "M393 121C410 90 425 60 426 28"];

/** The five stops in map coordinates. Order matters: it is the order of the journey. */
export const stationPositions = {
  alexandria: { x: 312, y: 49 },
  giza: { x: 386, y: 133 },
  luxor: { x: 477, y: 434 },
  aswan: { x: 492, y: 546 },
  abuSimbel: { x: 414, y: 668 },
} as const;
