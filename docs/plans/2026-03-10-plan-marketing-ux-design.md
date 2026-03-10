# Plan Marketing UX/UI Redesign

## Date: 2026-03-10

## Problem

The Plan marketing page (ActionsStep) has poor readability:

1. **KR Picker** shows only IDs (S1.1, M5.2) without text — unusable
2. **Form** is a flat 10+ field scroll with no hierarchy
3. **Table view** lacks KR and Phase columns — key info hidden
4. **Kanban cards** show only title + channel — no KR context

## Approach: Incremental Polish (Option A)

Improve each component without architecture changes. ~200 lines changed across 4 files.

## Design

### 1. KR Picker (ActionForm)

Replace flat badge grid with structured list:
- Group by **team** (Sales, Marketing, CSM) with colored header
- Sub-group by **objective** (S1, S2, M5...) with title
- Each KR shows: checkbox + `S1.1` badge + KR text (truncated at 50 chars)
- Default: **none selected** (manual creation) or **template KRs** (from template)
- Max height `max-h-56` with overflow scroll

### 2. Form Layout

Reorganize into logical sections:
- **Essentials** (always visible): Title, Description, Channel/Type/Priority (3-col grid)
- **Planning** (always visible): Phase + Est. days (2-col), Start/End dates (2-col)
- **Budget** (collapsed by default): Budget + Currency — toggle via chevron
- **Link to KRs** (always visible): New KR picker (see above)

### 3. Table View

New column set: Title | KRs | Channel | Status | Priority | Phase | Dates
- **KRs column**: colored badges (max 3 visible, then `+N` with tooltip)
- **Phase column**: badge with phase color
- **Remove Budget column** (rarely filled, available in form)

### 4. Kanban Cards

Add below existing channel/priority badges:
- **KR badges**: 1-2 colored badges (S1.1, M5.2)
- **Phase**: small text with phase icon

## Language

Keep English for field labels. Only the header "Plan marketing" stays French.

## Files to modify

1. `src/components/ui/action-form.jsx` — KR picker + sectioned layout
2. `src/components/ui/actions-table-view.jsx` — KRs + Phase columns
3. `src/components/ui/action-card.jsx` — KR badges + Phase in cards
4. `src/components/steps/ActionsStep.jsx` — pass krStatuses to table view

## Not in scope

- Modal/drawer form (Approach B)
- Filter bar (Approach C)
- i18n / language switching
