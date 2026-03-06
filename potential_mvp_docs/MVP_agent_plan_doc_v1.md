# Travel Destination Finder — Simple Product & UX Plan (No AI)

## 1) Product Direction (Locked)
1. Remove all AI/agentic functionality from the app and plan.
2. Keep user input simple:
   1. Dropdowns
   2. Tag selection
3. Use deterministic, rule-based recommendation logic from datasets.
4. Keep a map-first, intuitive, visually polished experience.

## 2) Core User Inputs
1. **Month** (dropdown)
2. **Trip type** (multi-tag input)
3. **Group type** (dropdown)
4. **Budget** (dropdown: budget / mid / luxury)
5. **Region preference** (optional tags, e.g., Europe, Southeast Asia)

No chat input is required for core flow.

## 3) Recommendation Logic (Rule-Based)
1. Score destinations from 0–100 using fixed weights.
2. Initial scoring weights:
   1. Climate fit for selected month: 45%
   2. Trip-type tag match: 25%
   3. Group-type match: 15%
   4. Budget compatibility: 10%
   5. Diversity/popularity balancing: 5%
3. Return transparent reasons such as:
   1. `Peak season in July`
   2. `Matches tags: beach, culture`
   3. `Fits mid budget`

## 4) Dataset Strategy
### 4.1 Data Sources for MVP
1. Admin0 global geography
2. Admin1 geography for selected countries
3. Monthly seasonality data
4. Destination tags and vibe metadata
5. Budget-band estimates

### 4.2 Data Quality Rules
1. Validate schema on import
2. Require full month coverage per destination
3. Validate tag taxonomy consistency
4. Track last-updated timestamp
5. Hide or de-prioritize incomplete records

### 4.3 Refresh Model
1. Weekly refresh for core datasets
2. Manual refresh trigger for urgent corrections

## 5) UX / UI Design Decisions
## 5.1 Experience Style
1. Start with a world map as the main canvas.
2. Use floating controls for filters (dropdowns + tag chips).
3. Show recommendations as cards in an expandable panel.
4. Keep the interface visual and exploratory, not conversational.

## 5.2 Interaction Behavior
1. Map color/opacity updates when filters change.
2. Smooth camera transitions to selected destination.
3. Animated card reorder when ranking changes.
4. Clear selected state for tags and dropdown filters.
5. One-click add/remove from shortlist.

## 5.3 Visual Quality Requirements
1. Strong typography hierarchy and spacing.
2. Clean color system with clear score legend.
3. Purposeful motion only (no noisy effects).
4. Mobile-first responsive layout.

## 6) Product Flows
1. **Default flow**
   1. User selects month + tags + group + budget
   2. Map and cards update instantly
   3. User opens destination details and saves shortlist
2. **Explore flow**
   1. User zooms world map
   2. Clicks country/region
   3. Sees local top recommendations
3. **Shortlist flow**
   1. User saves options
   2. Compares 2–4 destinations
   3. Chooses final destination

## 7) API / Interface Plan (Simple)
1. `POST /api/recommendations/query`
   1. Input: `month`, `tripTypes[]`, `groupType`, `budgetBand`, `regionTags[]?`
   2. Output: ranked list with `destinationId`, `score`, `reasons[]`, `bestMonths[]`, `estimatedDailyBudget`
2. `GET /api/destinations`
   1. Query filters: `countryIso?`, `adminLevel?`, `tags?`
3. `GET /api/destinations/:id`
   1. Full destination profile and score components
4. `POST /api/saved-destinations`
5. `GET /api/me/saved-destinations`
6. `DELETE /api/saved-destinations/:id`
7. `POST /api/events/recommendation-click`

No internal agent endpoints are needed.

## 8) Revised Implementation Plan
### Phase 0 — Product + UI Spec (1 week)
1. Finalize input model (dropdown + tags)
2. Finalize wireframes and interaction spec
3. Finalize scoring rule definitions

### Phase 1 — Data + Backend Foundation (1–2 weeks)
1. Build database schema and seed import
2. Implement deterministic scoring service
3. Implement recommendation + destination APIs

### Phase 2 — Map-First Frontend (1–2 weeks)
1. Build world map view and filter controls
2. Add recommendation cards and detail panel
3. Add animations for ranking/filter transitions

### Phase 3 — Accounts + Shortlist (1 week)
1. Auth and profile preferences
2. Save/remove destinations
3. Compare shortlist view

### Phase 4 — Hardening + Beta (1 week)
1. Performance optimization
2. Data validation checks and monitoring
3. Closed beta and UX refinements

## 9) Success Metrics
1. Recommendation click-through rate
2. Shortlist save rate
3. Repeat usage rate
4. Time to first saved destination

## 10) Booking Integrations (Later)
1. Start with external redirect links to booking partners.
2. Keep recommendations neutral and dataset-driven.
3. Add conversion tracking after MVP stability.

## 11) Immediate Next Deliverables
1. Updated high-fidelity screens for map + dropdown/tag controls
2. Final tag taxonomy and dropdown options list
3. Rule-based scoring table and edge-case rules
4. API request/response examples for frontend handoff
