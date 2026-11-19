// Allowed answers and limits for the trip planner. Client-safe: no server-only imports.
// The database CHECK constraints in db/migrations mirror these values.

export const DATE_MODES = ["specific", "flexible", "undecided"] as const;
export type DateMode = (typeof DATE_MODES)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const INTERESTS = [
  "history",
  "nile",
  "redsea",
  "desert",
  "culture",
  "family",
  "romantic",
  "everything",
] as const;
export type Interest = (typeof INTERESTS)[number];

export const DURATIONS = ["3-5", "6-8", "9-12", "13-16", "16+", "unsure"] as const;
export type Duration = (typeof DURATIONS)[number];

/** Per person, in EUR, for the whole trip. `min`/`max` are for display only. */
export const BUDGETS = [
  "lt1000",
  "1000-1500",
  "1500-2500",
  "2500-4000",
  "4000+",
  "unsure",
] as const;
export type Budget = (typeof BUDGETS)[number];
export const BUDGET_BOUNDS: Record<Budget, { min?: number; max?: number }> = {
  lt1000: { max: 1000 },
  "1000-1500": { min: 1000, max: 1500 },
  "1500-2500": { min: 1500, max: 2500 },
  "2500-4000": { min: 2500, max: 4000 },
  "4000+": { min: 4000 },
  unsure: {},
};
/** The planner asks for a per-person estimate, which makes inquiries easier to qualify. */
export const BUDGET_TYPE = "per_person" as const;

export const LIMITS = {
  adultsMax: 12,
  childrenMax: 8,
  travelersMax: 16,
  childAgeMax: 17,
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
  phoneMax: 32,
  notesMax: 1500,
  /** How far ahead an arrival date or a preferred month may be. */
  horizonDays: 730,
  stayMaxDays: 90,
} as const;

/** ISO 3166-1 alpha-2 codes. Names come from Intl.DisplayNames in the visitor's language. */
export const COUNTRY_CODES: readonly string[] = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS " +
  "BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE " +
  "EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN " +
  "HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI " +
  "LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA " +
  "NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU " +
  "RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN " +
  "TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/**
 * Version of the privacy policy the visitor consents to. PLACEHOLDER: the owner must set this to
 * the real version/date of the published Privacy Policy (Phase 7) and bump it whenever the text changes.
 */
export const CONSENT_VERSION = "privacy-draft-0";
