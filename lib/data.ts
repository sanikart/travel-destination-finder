import { promises as fs } from 'node:fs';
import path from 'node:path';

import { stableHash } from '@/lib/hash';
import {
  getCountryTourismMetadata,
  getRegionTourismOverride,
  type TourismMetadata
} from '@/lib/tourism-metadata';
import type { ClimateSeason, Destination, Month } from '@/lib/types';

type SeasonsMap = Record<string, Record<Month, ClimateSeason>>;
type VibesMap = Record<string, { trip_types?: string[]; group_types?: string[]; tags?: string[]; notes?: string }>;
type Admin1Region = { region_id: string; country_iso3: string; name: string };
type CountryLabelsGeoJson = {
  features: Array<{
    properties?: {
      iso3?: string;
      name?: string;
    };
  }>;
};

const DATA_DIR = path.join(process.cwd(), 'data');

let destinationsCache: Destination[] | null = null;

const FALLBACK_METADATA: TourismMetadata = {
  tourismOpen: false,
  tourismFriendlinessScore: 0,
  coastalScore: 0,
  dataConfidence: 0,
  sourceNote: 'Missing curated tourism metadata.',
  lastReviewedAt: '2026-03-06'
};

function budgetFromId(id: string): number {
  const value = stableHash(id) % 170;
  return 45 + value;
}

function seasonRecordForCountry(seasons: SeasonsMap, countryIso3: string): Record<Month, ClimateSeason> {
  const fallback: Record<Month, ClimateSeason> = {
    jan: 'Unknown',
    feb: 'Unknown',
    mar: 'Unknown',
    apr: 'Unknown',
    may: 'Unknown',
    jun: 'Unknown',
    jul: 'Unknown',
    aug: 'Unknown',
    sep: 'Unknown',
    oct: 'Unknown',
    nov: 'Unknown',
    dec: 'Unknown'
  };

  return { ...fallback, ...(seasons[countryIso3] ?? {}) };
}

async function readJson<T>(filename: string): Promise<T> {
  const raw = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
  return JSON.parse(raw) as T;
}

function mergeMetadata(base: TourismMetadata, override: Partial<TourismMetadata> | null): TourismMetadata {
  return {
    tourismOpen: override?.tourismOpen ?? base.tourismOpen,
    tourismFriendlinessScore: override?.tourismFriendlinessScore ?? base.tourismFriendlinessScore,
    coastalScore: override?.coastalScore ?? base.coastalScore,
    dataConfidence: override?.dataConfidence ?? base.dataConfidence,
    sourceNote: override?.sourceNote ?? base.sourceNote,
    lastReviewedAt: override?.lastReviewedAt ?? base.lastReviewedAt
  };
}

export async function getDestinations(): Promise<Destination[]> {
  if (destinationsCache) {
    return destinationsCache;
  }

  const [seasons, countryVibes, admin1Regions, admin1Vibes, countryLabels] = await Promise.all([
    readJson<SeasonsMap>('seasons.json'),
    readJson<VibesMap>('region_vibes.json'),
    readJson<Admin1Region[]>('world_admin1_regions.json'),
    readJson<VibesMap>('region_vibes_admin1.json'),
    readJson<CountryLabelsGeoJson>('country_labels.geojson')
  ]);

  const countryNameByIso3 = new Map<string, string>();
  for (const feature of countryLabels.features) {
    const iso3 = feature.properties?.iso3;
    const name = feature.properties?.name;
    if (!iso3 || !name) continue;
    if (!countryNameByIso3.has(iso3)) {
      countryNameByIso3.set(iso3, name);
    }
  }

  const countries: Destination[] = Object.keys(seasons).map((countryIso3) => {
    const vibes = countryVibes[countryIso3] ?? {};
    const metadata = getCountryTourismMetadata(countryIso3) ?? FALLBACK_METADATA;
    return {
      id: countryIso3,
      name: countryNameByIso3.get(countryIso3) ?? countryIso3,
      countryIso3,
      adminLevel: 0,
      regionId: null,
      tourismOpen: metadata.tourismOpen,
      tourismFriendlinessScore: metadata.tourismFriendlinessScore,
      coastalScore: metadata.coastalScore,
      dataConfidence: metadata.dataConfidence,
      sourceNote: metadata.sourceNote,
      lastReviewedAt: metadata.lastReviewedAt,
      tripTypes: vibes.trip_types ?? [],
      groupTypes: vibes.group_types ?? [],
      tags: vibes.tags ?? [],
      notes: vibes.notes ?? '',
      estimatedDailyBudget: budgetFromId(countryIso3),
      climateByMonth: seasonRecordForCountry(seasons, countryIso3)
    };
  });

  const admin1: Destination[] = admin1Regions.map((region) => {
    const regionSpecificVibes = admin1Vibes[region.region_id];
    const countryFallbackVibes = countryVibes[region.country_iso3] ?? {};
    const vibes = regionSpecificVibes ?? {};
    const countryMetadata = getCountryTourismMetadata(region.country_iso3) ?? FALLBACK_METADATA;
    const regionOverride = getRegionTourismOverride(region.region_id);
    const regionMetadata = mergeMetadata(countryMetadata, regionOverride);
    const hasCuratedRegionSignals = Boolean(regionSpecificVibes) || Boolean(regionOverride);
    const confidence = hasCuratedRegionSignals
      ? regionMetadata.dataConfidence
      : Math.min(regionMetadata.dataConfidence, 40);
    return {
      id: region.region_id,
      name: region.name,
      countryIso3: region.country_iso3,
      adminLevel: 1,
      regionId: region.region_id,
      tourismOpen: regionMetadata.tourismOpen,
      tourismFriendlinessScore: regionMetadata.tourismFriendlinessScore,
      coastalScore: regionMetadata.coastalScore,
      dataConfidence: confidence,
      sourceNote: regionMetadata.sourceNote,
      lastReviewedAt: regionMetadata.lastReviewedAt,
      tripTypes: vibes.trip_types ?? [],
      groupTypes: vibes.group_types ?? [],
      tags: vibes.tags ?? [],
      notes: vibes.notes ?? countryFallbackVibes.notes ?? '',
      estimatedDailyBudget: budgetFromId(region.region_id),
      climateByMonth: seasonRecordForCountry(seasons, region.country_iso3)
    };
  });

  destinationsCache = [...countries, ...admin1];
  return destinationsCache;
}

export async function getDestinationById(destinationId: string): Promise<Destination | undefined> {
  const all = await getDestinations();
  return all.find((destination) => destination.id === destinationId);
}

export function clearDestinationCache(): void {
  destinationsCache = null;
}

export async function getDatasetQualitySummary(): Promise<{
  totalDestinations: number;
  tourismOpenCount: number;
  curatedCount: number;
  missingMetadataCount: number;
  lowConfidenceCount: number;
  beachEligibleCount: number;
}> {
  const destinations = await getDestinations();
  const curatedCount = destinations.filter((destination) => destination.dataConfidence > 0).length;
  const tourismOpenCount = destinations.filter((destination) => destination.tourismOpen).length;
  const lowConfidenceCount = destinations.filter((destination) => destination.dataConfidence > 0 && destination.dataConfidence < 55).length;
  const beachEligibleCount = destinations.filter(
    (destination) =>
      destination.tourismOpen &&
      destination.dataConfidence >= 55 &&
      destination.tourismFriendlinessScore >= 45 &&
      destination.coastalScore >= 60
  ).length;

  return {
    totalDestinations: destinations.length,
    tourismOpenCount,
    curatedCount,
    missingMetadataCount: destinations.length - curatedCount,
    lowConfidenceCount,
    beachEligibleCount
  };
}
