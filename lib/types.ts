export const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'] as const;
export type Month = (typeof MONTHS)[number];

export const GROUP_TYPES = ['any', 'solo', 'couples', 'friends', 'families'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const BUDGET_BANDS = ['budget', 'mid', 'luxury'] as const;
export type BudgetBand = (typeof BUDGET_BANDS)[number];

export const TRIP_TAGS = [
  'leisure',
  'touristy',
  'adventure',
  'nature',
  'beach',
  'city',
  'culture',
  'party',
  'food'
] as const;
export type TripTag = (typeof TRIP_TAGS)[number];

export type ClimateSeason = 'Peak' | 'Shoulder' | 'Off' | 'Unknown';

export type Destination = {
  id: string;
  name: string;
  countryIso3: string;
  adminLevel: 0 | 1;
  regionId: string | null;
  tourismOpen: boolean;
  tourismFriendlinessScore: number;
  coastalScore: number;
  dataConfidence: number;
  sourceNote: string;
  lastReviewedAt: string;
  tripTypes: string[];
  groupTypes: string[];
  tags: string[];
  notes: string;
  estimatedDailyBudget: number;
  climateByMonth: Record<Month, ClimateSeason>;
};

export type RecommendationInput = {
  month: Month;
  tripTypes: string[];
  groupType: GroupType;
  budgetBand: BudgetBand;
  regionTags?: string[];
  limit?: number;
};

export type RecommendationItem = {
  destinationId: string;
  name: string;
  countryIso3: string;
  adminLevel: 0 | 1;
  regionId: string | null;
  score: number;
  reasons: string[];
  bestMonths: Month[];
  estimatedDailyBudget: number;
};

export type SavedDestination = {
  id: string;
  userId: string;
  destinationId: string;
  note: string;
  createdAt: string;
};
