import type { BudgetBand, ClimateSeason, Destination, Month, RecommendationInput, RecommendationItem } from '@/lib/types';

const MIN_DATA_CONFIDENCE = 55;
const MIN_TOURISM_FRIENDLINESS = 45;
const BEACH_COASTAL_MIN = 60;

function seasonScore(season: ClimateSeason): number {
  if (season === 'Peak') return 100;
  if (season === 'Shoulder') return 70;
  if (season === 'Off') return 35;
  return 15;
}

function tripTypeScore(selected: string[], available: string[]): number {
  if (selected.length === 0) return 100;
  const matchCount = selected.filter((value) => available.includes(value)).length;
  return Math.round((matchCount / selected.length) * 100);
}

function groupScore(selectedGroup: string, availableGroups: string[]): number {
  if (selectedGroup === 'any') return 100;
  return availableGroups.includes(selectedGroup) ? 100 : 0;
}

function budgetScore(budgetBand: BudgetBand, estimatedDailyBudget: number): number {
  if (budgetBand === 'budget') {
    if (estimatedDailyBudget <= 80) return 100;
    if (estimatedDailyBudget <= 120) return 65;
    return 30;
  }

  if (budgetBand === 'mid') {
    if (estimatedDailyBudget >= 80 && estimatedDailyBudget <= 170) return 100;
    if (estimatedDailyBudget <= 220) return 70;
    return 40;
  }

  if (estimatedDailyBudget >= 170) return 100;
  if (estimatedDailyBudget >= 130) return 70;
  return 35;
}

function diversityPopularityScore(index: number): number {
  const value = 100 - Math.min(45, Math.floor(index / 3));
  return Math.max(55, value);
}

function contextTrustScore(destination: Destination, diversityIndex: number): number {
  const diversity = diversityPopularityScore(diversityIndex);
  return Math.round(
    (diversity * 0.5) +
      (destination.tourismFriendlinessScore * 0.35) +
      (destination.dataConfidence * 0.15)
  );
}

function bestMonths(climateByMonth: Destination['climateByMonth']): Month[] {
  return (Object.keys(climateByMonth) as Month[])
    .map((month) => ({ month, score: seasonScore(climateByMonth[month]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.month);
}

function buildReasons(destination: Destination, input: RecommendationInput, components: Record<string, number>): string[] {
  const reasons: string[] = [];
  reasons.push(`${destination.climateByMonth[input.month]} season in ${input.month.toUpperCase()}`);

  if (input.tripTypes.length > 0) {
    const matches = input.tripTypes.filter((tag) => destination.tripTypes.includes(tag));
    if (matches.length > 0) {
      reasons.push(`Matches: ${matches.slice(0, 3).join(', ')}`);
    }
  }

  if (input.groupType !== 'any' && components.group >= 100) {
    reasons.push(`Good for ${input.groupType}`);
  }

  if (components.budget >= 90) {
    reasons.push(`Fits ${input.budgetBand} budget`);
  }

  if (destination.tourismFriendlinessScore >= 80) {
    reasons.push('Tourism-friendly destination');
  }

  if (input.tripTypes.includes('beach') && destination.coastalScore >= BEACH_COASTAL_MIN) {
    reasons.push('Strong beach/coastal suitability');
  }

  if (reasons.length < 3 && destination.tags.length > 0) {
    reasons.push(destination.tags.slice(0, 3).join(', '));
  }

  return reasons.slice(0, 3);
}

function isEligibleByPolicy(destination: Destination, input: RecommendationInput): boolean {
  if (!destination.tourismOpen) return false;
  if (destination.dataConfidence < MIN_DATA_CONFIDENCE) return false;
  if (destination.tourismFriendlinessScore < MIN_TOURISM_FRIENDLINESS) return false;

  if (input.tripTypes.includes('beach')) {
    if (destination.coastalScore < BEACH_COASTAL_MIN) return false;
    if (destination.adminLevel === 1) {
      const normalizedTags = destination.tags.map((tag) => tag.toLowerCase());
      const explicitBeachSignal =
        destination.tripTypes.includes('beach') ||
        normalizedTags.some((tag) => tag.includes('beach') || tag.includes('coast') || tag.includes('island'));
      if (!explicitBeachSignal) return false;
    }
  }

  return true;
}

function scoreDestination(destination: Destination, input: RecommendationInput, diversityIndex: number): RecommendationItem {
  const climate = seasonScore(destination.climateByMonth[input.month]);
  const trip = tripTypeScore(input.tripTypes, destination.tripTypes);
  const group = groupScore(input.groupType, destination.groupTypes);
  const budget = budgetScore(input.budgetBand, destination.estimatedDailyBudget);
  const context = contextTrustScore(destination, diversityIndex);

  const score = Math.round(
    (climate * 0.45) + (trip * 0.25) + (group * 0.15) + (budget * 0.10) + (context * 0.05)
  );

  return {
    destinationId: destination.id,
    name: destination.name,
    countryIso3: destination.countryIso3,
    adminLevel: destination.adminLevel,
    regionId: destination.regionId,
    score,
    reasons: buildReasons(destination, input, { climate, trip, group, budget, context }),
    bestMonths: bestMonths(destination.climateByMonth),
    estimatedDailyBudget: destination.estimatedDailyBudget
  };
}

function regionTagMatch(destination: Destination, regionTags: string[]): boolean {
  if (regionTags.length === 0) return true;
  const lowerTags = destination.tags.map((tag) => tag.toLowerCase());
  return regionTags.some((tag) => lowerTags.includes(tag.toLowerCase()) || destination.countryIso3.toLowerCase() === tag.toLowerCase());
}

export function buildRecommendations(destinations: Destination[], input: RecommendationInput): RecommendationItem[] {
  const filtered = destinations.filter(
    (destination) =>
      regionTagMatch(destination, input.regionTags ?? []) && isEligibleByPolicy(destination, input)
  );

  const ranked = filtered
    .map((destination, index) => scoreDestination(destination, input, index))
    .sort((a, b) => b.score - a.score || a.destinationId.localeCompare(b.destinationId));

  return ranked.slice(0, input.limit ?? 60);
}
