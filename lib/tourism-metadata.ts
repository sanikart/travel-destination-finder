export type TourismMetadata = {
  tourismOpen: boolean;
  tourismFriendlinessScore: number;
  coastalScore: number;
  dataConfidence: number;
  sourceNote: string;
  lastReviewedAt: string;
};

const REVIEW_DATE = '2026-03-06';
const SOURCE_NOTE = 'Curated from travel accessibility, tourism infrastructure, and safety context.';

function entry(
  tourismOpen: boolean,
  tourismFriendlinessScore: number,
  coastalScore: number,
  dataConfidence = 78
): TourismMetadata {
  return {
    tourismOpen,
    tourismFriendlinessScore,
    coastalScore,
    dataConfidence,
    sourceNote: SOURCE_NOTE,
    lastReviewedAt: REVIEW_DATE
  };
}

export const COUNTRY_TOURISM_METADATA: Record<string, TourismMetadata> = {
  ARG: entry(true, 72, 62),
  ARE: entry(true, 88, 64),
  AUS: entry(true, 91, 89),
  AUT: entry(true, 87, 22),
  BEL: entry(true, 80, 40),
  BGR: entry(true, 73, 66),
  BRA: entry(true, 78, 84),
  CAN: entry(true, 88, 72),
  CHE: entry(true, 86, 10),
  CHL: entry(true, 79, 78),
  COL: entry(true, 72, 70),
  CRI: entry(true, 89, 92),
  CZE: entry(true, 78, 10),
  DEU: entry(true, 84, 42),
  DNK: entry(true, 82, 58),
  DOM: entry(true, 83, 94),
  ECU: entry(true, 74, 82),
  EGY: entry(true, 70, 68),
  ESP: entry(true, 91, 88),
  FIN: entry(true, 80, 46),
  FRA: entry(true, 90, 76),
  GBR: entry(true, 89, 70),
  GEO: entry(true, 74, 44),
  GRC: entry(true, 91, 96),
  HRV: entry(true, 86, 95),
  HUN: entry(true, 74, 8),
  IDN: entry(true, 86, 90),
  IND: entry(true, 76, 63),
  IRL: entry(true, 85, 77),
  IRN: entry(true, 35, 30, 62),
  ISL: entry(true, 84, 81),
  ISR: entry(true, 52, 58, 60),
  ITA: entry(true, 92, 90),
  JPN: entry(true, 93, 76),
  KEN: entry(true, 76, 71),
  KHM: entry(true, 72, 35),
  KOR: entry(true, 87, 64),
  LAO: entry(true, 61, 8),
  LKA: entry(true, 80, 95),
  MAR: entry(true, 79, 78),
  MEX: entry(true, 79, 88),
  MLT: entry(true, 85, 97),
  MYS: entry(true, 84, 82),
  NLD: entry(true, 84, 56),
  NOR: entry(true, 82, 73),
  NZL: entry(true, 90, 88),
  OMN: entry(true, 79, 71),
  PER: entry(true, 77, 58),
  PHL: entry(true, 78, 90),
  POL: entry(true, 78, 43),
  PRT: entry(true, 90, 96),
  QAT: entry(true, 82, 55),
  ROU: entry(true, 70, 44),
  SAU: entry(true, 66, 54),
  SGP: entry(true, 93, 80),
  SVK: entry(true, 72, 6),
  SVN: entry(true, 80, 24),
  SWE: entry(true, 82, 55),
  THA: entry(true, 89, 95),
  TUN: entry(true, 72, 82),
  TUR: entry(true, 82, 83),
  TWN: entry(true, 83, 76),
  USA: entry(true, 90, 79),
  VNM: entry(true, 81, 84),
  ZAF: entry(true, 74, 80),

  AFG: entry(false, 8, 0, 82),
  BLR: entry(false, 15, 10, 76),
  LBY: entry(false, 10, 34, 80),
  PRK: entry(false, 5, 22, 86),
  RUS: entry(false, 12, 52, 75),
  SDN: entry(false, 7, 18, 84),
  SOM: entry(false, 6, 40, 82),
  SYR: entry(false, 5, 20, 88),
  UKR: entry(false, 9, 44, 88),
  YEM: entry(false, 4, 36, 86)
};

export const REGION_TOURISM_OVERRIDES: Record<string, Partial<TourismMetadata>> = {
  'IND-IN-GA': {
    tourismOpen: true,
    tourismFriendlinessScore: 86,
    coastalScore: 97,
    dataConfidence: 82
  },
  'IND-IN-KL': {
    tourismOpen: true,
    tourismFriendlinessScore: 84,
    coastalScore: 94,
    dataConfidence: 82
  },
  'IND-IN-DL': {
    tourismOpen: true,
    tourismFriendlinessScore: 72,
    coastalScore: 8,
    dataConfidence: 78
  },
  'ESP-25490228B14384488423733': {
    tourismOpen: true,
    tourismFriendlinessScore: 90,
    coastalScore: 97,
    dataConfidence: 82
  }
};

export function getCountryTourismMetadata(iso3: string): TourismMetadata | null {
  return COUNTRY_TOURISM_METADATA[iso3] ?? null;
}

export function getRegionTourismOverride(regionId: string): Partial<TourismMetadata> | null {
  return REGION_TOURISM_OVERRIDES[regionId] ?? null;
}
