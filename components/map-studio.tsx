'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

import {
  MONTHS,
  TRIP_TAGS,
  type BudgetBand,
  type Destination,
  type GroupType,
  type Month,
  type RecommendationItem
} from '@/lib/types';

type RecommendationResponse = {
  count: number;
  recommendations: RecommendationItem[];
};

type SavedDestinationEntry = {
  id: string;
  destinationId: string;
  note: string;
  createdAt: string;
  destination: Destination | null;
};

type SavedResponse = {
  count: number;
  savedDestinations: SavedDestinationEntry[];
};

const SOURCE_ID = 'countries';
const SOURCE_LAYER = 'countries';
const ADMIN1_SOURCE_ID = 'admin1';
const ADMIN1_SOURCE_LAYER = 'admin1';

function currentMonthValue(): Month {
  const now = new Date();
  return MONTHS[now.getMonth()] ?? 'jul';
}

function getClientUserId(): string {
  const key = 'tdf-user-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const generated = `user-${Math.random().toString(36).slice(2, 12)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

export function MapStudio(): React.JSX.Element {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const previousCountryIdsRef = useRef<string[]>([]);
  const previousRegionIdsRef = useRef<string[]>([]);
  const recommendationLookupRef = useRef<Map<string, RecommendationItem>>(new Map());
  const recommendationRankRef = useRef<Map<string, number>>(new Map());
  const userIdRef = useRef<string>('');
  const monthRef = useRef<Month>('jul');

  const [month, setMonth] = useState<Month>(currentMonthValue());
  const [groupType, setGroupType] = useState<GroupType>('any');
  const [budgetBand, setBudgetBand] = useState<BudgetBand>('mid');
  const [tripTypes, setTripTypes] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<SavedDestinationEntry[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);

  const totalMatches = recommendations.length;

  const recommendationLookup = useMemo(
    () => new Map(recommendations.map((item) => [item.destinationId, item])),
    [recommendations]
  );

  const recommendationRank = useMemo(() => {
    const rank = new Map<string, number>();
    recommendations.forEach((item, index) => {
      rank.set(item.destinationId, index + 1);
    });
    return rank;
  }, [recommendations]);

  const savedByDestinationId = useMemo(
    () => new Map(savedDestinations.map((item) => [item.destinationId, item])),
    [savedDestinations]
  );

  const compareItems = useMemo(() => savedDestinations.slice(0, 4), [savedDestinations]);

  useEffect(() => {
    recommendationLookupRef.current = recommendationLookup;
    recommendationRankRef.current = recommendationRank;
  }, [recommendationLookup, recommendationRank]);

  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  useEffect(() => {
    const id = getClientUserId();
    userIdRef.current = id;
    setUserId(id);
  }, []);

  async function fetchSavedDestinations(currentUserId: string): Promise<void> {
    const response = await fetch('/api/me/saved-destinations', {
      headers: { 'x-user-id': currentUserId }
    });

    if (!response.ok) {
      throw new Error(`Saved list request failed with ${response.status}`);
    }

    const payload = (await response.json()) as SavedResponse;
    setSavedDestinations(payload.savedDestinations);
  }

  useEffect(() => {
    if (!userId) return;

    void fetchSavedDestinations(userId).catch((requestError) => {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load shortlist');
    });
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecommendations(): Promise<void> {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/recommendations/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            month,
            tripTypes,
            groupType,
            budgetBand,
            limit: 120
          })
        });

        if (!response.ok) {
          throw new Error(`Request failed with ${response.status}`);
        }

        const data = (await response.json()) as RecommendationResponse;
        if (!cancelled) {
          setRecommendations(data.recommendations);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load recommendations');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [month, tripTypes, groupType, budgetBand]);

  async function trackRecommendationClick(item: RecommendationItem, position?: number): Promise<void> {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;

    await fetch('/api/events/recommendation-click', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': currentUserId
      },
      body: JSON.stringify({
        destinationId: item.destinationId,
        score: item.score,
        position: position ?? recommendationRankRef.current.get(item.destinationId) ?? 1,
        month: monthRef.current
      })
    }).catch(() => {
      // Fire-and-forget analytics call.
    });
  }

  function tooltipHtml(item: RecommendationItem): string {
    const reasons = item.reasons.map((reason) => `<li>${reason}</li>`).join('');
    const bestMonths = item.bestMonths.map((value) => value.toUpperCase()).join(', ');
    return `
      <div class="travel-tooltip">
        <div class="travel-tooltip-top">
          <strong>${item.name}</strong>
          <span class="travel-tooltip-score">${item.score}%</span>
        </div>
        <div class="travel-tooltip-meta">${item.countryIso3}${item.adminLevel === 1 ? ' · Region' : ' · Country'}</div>
        <div class="travel-tooltip-meta">Budget: $${item.estimatedDailyBudget}/day</div>
        <div class="travel-tooltip-meta">Best months: ${bestMonths}</div>
        <ul>${reasons}</ul>
      </div>
    `;
  }

  async function saveDestination(item: RecommendationItem): Promise<void> {
    if (!userId) return;
    setSaving(true);

    try {
      const response = await fetch('/api/saved-destinations', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ destinationId: item.destinationId })
      });

      if (!response.ok) {
        throw new Error(`Save failed with ${response.status}`);
      }

      await fetchSavedDestinations(userId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save destination');
    } finally {
      setSaving(false);
    }
  }

  async function removeSavedDestination(destinationId: string): Promise<void> {
    if (!userId) return;
    const savedEntry = savedByDestinationId.get(destinationId);
    if (!savedEntry) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/saved-destinations/${encodeURIComponent(savedEntry.id)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': userId }
      });

      if (!response.ok) {
        throw new Error(`Remove failed with ${response.status}`);
      }

      await fetchSavedDestinations(userId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to remove destination');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const origin = window.location.origin;
    const countriesTiles = `pmtiles://${origin}/api/files/data/world_admin0_with_seasons_v4.pmtiles`;
    const admin1Tiles = `pmtiles://${origin}/api/files/data/world_admin1.pmtiles`;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [8, 18],
      zoom: 2.1,
      minZoom: 1.6,
      attributionControl: false,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {},
        layers: [
          {
            id: 'land-mask',
            type: 'background',
            paint: { 'background-color': '#ffffff' }
          },
          {
            id: 'water',
            type: 'background',
            paint: { 'background-color': '#d2e8ff' }
          }
        ]
      }
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    const popup = new maplibregl.Popup({ closeButton: false, closeOnMove: true, offset: 10 });

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'vector',
        url: countriesTiles,
        promoteId: 'ADM0_A3'
      });

      map.addSource(ADMIN1_SOURCE_ID, {
        type: 'vector',
        url: admin1Tiles,
        promoteId: 'region_id'
      });

      map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: SOURCE_ID,
        'source-layer': SOURCE_LAYER,
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'score'], 0],
            0,
            '#f1f1f1',
            0.6,
            '#afe8cf',
            1,
            '#0d9f7f'
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'score'], 0],
            0,
            0.22,
            1,
            0.92
          ],
          'fill-outline-color': '#c8cdd8'
        }
      });

      map.addLayer({
        id: 'admin1-fill',
        type: 'fill',
        source: ADMIN1_SOURCE_ID,
        'source-layer': ADMIN1_SOURCE_LAYER,
        minzoom: 3,
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'score'], 0],
            0,
            '#f3f3f3',
            0.6,
            '#c5ead6',
            1,
            '#0f9d7f'
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['coalesce', ['feature-state', 'score'], 0],
            0,
            0.08,
            1,
            0.88
          ]
        }
      });

      map.addLayer({
        id: 'admin1-boundary',
        type: 'line',
        source: ADMIN1_SOURCE_ID,
        'source-layer': ADMIN1_SOURCE_LAYER,
        minzoom: 3,
        paint: {
          'line-color': '#8e93a4',
          'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.2, 6, 0.8],
          'line-opacity': 0.7
        }
      });

      map.addLayer({
        id: 'countries-boundary',
        type: 'line',
        source: SOURCE_ID,
        'source-layer': SOURCE_LAYER,
        paint: {
          'line-color': '#aeb4c5',
          'line-width': ['interpolate', ['linear'], ['zoom'], 1.5, 0.3, 5, 1],
          'line-opacity': 0.86
        }
      });

      map.addSource('country-labels', {
        type: 'geojson',
        data: '/api/files/data/country_labels.geojson'
      });

      map.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'country-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular']
        },
        paint: {
          'text-color': '#344861',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        },
        minzoom: 2
      });

      map.on('click', (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: ['admin1-fill', 'countries-fill']
        });
        if (features.length === 0) return;

        const feature = features[0];
        const properties = feature.properties ?? {};
        let recommendation: RecommendationItem | undefined;

        if (feature.layer.id === 'admin1-fill') {
          const regionId = String(feature.id ?? properties.region_id ?? '');
          recommendation = recommendationLookupRef.current.get(regionId);

          if (!recommendation) {
            const countryIso = String(properties.country_iso3 ?? '');
            if (countryIso) {
              recommendation = recommendationLookupRef.current.get(countryIso);
            }
          }
        } else {
          const countryIso = String(feature.id ?? properties.ADM0_A3 ?? properties.iso3 ?? '');
          recommendation = recommendationLookupRef.current.get(countryIso);
        }

        if (recommendation) {
          void trackRecommendationClick(recommendation);
        }

        popup
          .setLngLat(event.lngLat)
          .setHTML(
            recommendation
              ? tooltipHtml(recommendation)
              : '<div class="travel-tooltip"><strong>No eligible match</strong><div class="travel-tooltip-meta">Try adjusting filters or clicking a nearby destination.</div></div>'
          )
          .addTo(map);
      });

      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    for (const countryId of previousCountryIdsRef.current) {
      map.setFeatureState({ source: SOURCE_ID, sourceLayer: SOURCE_LAYER, id: countryId }, { score: 0 });
    }

    for (const regionId of previousRegionIdsRef.current) {
      map.setFeatureState({ source: ADMIN1_SOURCE_ID, sourceLayer: ADMIN1_SOURCE_LAYER, id: regionId }, { score: 0 });
    }

    const countryScores = new Map<string, number>();
    const regionScores = new Map<string, number>();

    for (const recommendation of recommendations) {
      const normalized = Math.max(0, Math.min(1, recommendation.score / 100));

      if (recommendation.adminLevel === 0) {
        countryScores.set(recommendation.countryIso3, normalized);
      }

      if (recommendation.adminLevel === 1 && recommendation.regionId) {
        regionScores.set(recommendation.regionId, normalized);
        const currentCountryScore = countryScores.get(recommendation.countryIso3) ?? 0;
        countryScores.set(recommendation.countryIso3, Math.max(currentCountryScore, normalized));
      }
    }

    for (const [countryId, score] of countryScores.entries()) {
      map.setFeatureState({ source: SOURCE_ID, sourceLayer: SOURCE_LAYER, id: countryId }, { score });
    }

    for (const [regionId, score] of regionScores.entries()) {
      map.setFeatureState({ source: ADMIN1_SOURCE_ID, sourceLayer: ADMIN1_SOURCE_LAYER, id: regionId }, { score });
    }

    previousCountryIdsRef.current = Array.from(countryScores.keys());
    previousRegionIdsRef.current = Array.from(regionScores.keys());
  }, [mapReady, recommendations]);

  function toggleTag(tag: string): void {
    setTripTypes((current) =>
      current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]
    );
  }

  return (
    <main className="map-page">
      <div ref={mapContainerRef} className="map-canvas" />

      <section className="control-panel">
        <h1 className="control-title">World Travel Finder</h1>
        <div className="filter-grid">
          <div>
            <label htmlFor="month">Month</label>
            <select id="month" value={month} onChange={(event) => setMonth(event.target.value as Month)}>
              {MONTHS.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="group">Group</label>
            <select
              id="group"
              value={groupType}
              onChange={(event) => setGroupType(event.target.value as GroupType)}
            >
              <option value="any">Any</option>
              <option value="solo">Solo</option>
              <option value="couples">Couples</option>
              <option value="friends">Friends</option>
              <option value="families">Families</option>
            </select>
          </div>
          <div>
            <label htmlFor="budget">Budget</label>
            <select
              id="budget"
              value={budgetBand}
              onChange={(event) => setBudgetBand(event.target.value as BudgetBand)}
            >
              <option value="budget">Budget</option>
              <option value="mid">Mid</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>
        </div>

        <div className="tag-block">
          <label>Trip Tags</label>
          <div className="tag-list">
            {TRIP_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                className={`tag-chip ${tripTypes.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="results-panel">
        <div className="results-header">
          <h2>Top Matches</h2>
          <p>{loading ? 'Updating recommendations...' : `${totalMatches} matches for your filters`}</p>
          {error ? <p className="status-text">{error}</p> : null}
          <span className="legend-chip">Tap map regions for tooltip details (all zoom levels)</span>
        </div>

        <div className="results-list">
          {recommendations.length === 0 ? (
            <p className="status-text">
              No destinations pass the current filters and tourism eligibility rules.
            </p>
          ) : null}
          {recommendations.slice(0, 30).map((item, index) => {
            const savedEntry = savedByDestinationId.get(item.destinationId);
            return (
              <article
                className="result-card"
                key={item.destinationId}
                onClick={() => {
                  void trackRecommendationClick(item, index + 1);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void trackRecommendationClick(item, index + 1);
                  }
                }}
              >
                <div className="result-title">
                  <strong>{item.name}</strong>
                  <span className="score-pill">{item.score}%</span>
                </div>
                <div>
                  {item.countryIso3}
                  {item.adminLevel === 1 ? ' · Region' : ''}
                </div>
                <ul className="reason-list">
                  {item.reasons.map((reason) => (
                    <li key={`${item.destinationId}-${reason}`}>{reason}</li>
                  ))}
                </ul>
                <div className="result-actions">
                  {savedEntry ? (
                    <button
                      type="button"
                      className="action-btn secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeSavedDestination(item.destinationId);
                      }}
                      disabled={saving}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="action-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        void saveDestination(item);
                      }}
                      disabled={saving}
                    >
                      Save
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <section className="compare-panel">
          <h3>Shortlist Compare ({savedDestinations.length})</h3>
          {compareItems.length === 0 ? (
            <p className="status-text">Save destinations to compare them here.</p>
          ) : (
            <div className="compare-grid">
              {compareItems.map((entry) => (
                <article className="compare-card" key={entry.id}>
                  <strong>{entry.destination?.name ?? entry.destinationId}</strong>
                  <span>{entry.destination?.countryIso3 ?? '-'}</span>
                  <span>${entry.destination?.estimatedDailyBudget ?? '-'} / day</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>
    </main>
  );
}
