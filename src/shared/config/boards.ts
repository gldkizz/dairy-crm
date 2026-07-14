export const BOARD_ROUTES = {
  COLD: "/sales/cold",
  WARM: "/sales/warm",
  HOT: "/sales/hot",
} as const;

export type BoardSlug = "cold" | "warm" | "hot";

export const SLUG_TO_BOARD_TYPE = {
  cold: "COLD",
  warm: "WARM",
  hot: "HOT",
} as const;

export const BOARD_TYPE_TO_SLUG = {
  COLD: "cold",
  WARM: "warm",
  HOT: "hot",
} as const;

export const BOARD_LABELS = {
  COLD: "Холодные",
  WARM: "Теплые",
  HOT: "Горячие",
} as const;
