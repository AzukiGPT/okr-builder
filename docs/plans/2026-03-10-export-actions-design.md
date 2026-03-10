# Export & Partage du Plan d'Actions — Design Doc

## Goal

Allow users to export their action plan (Step 4) as PDF, Excel, Notion-ready Markdown, or a shareable compressed URL. Follows the same patterns already established for OKR exports in Step 3.

## Architecture

4 independent utility modules + 1 UI toolbar component. No shared abstraction layer — each format is different enough (visual layout vs cells vs Markdown vs compression) that a common adapter would be premature.

### Files

| File | Library | Output |
|------|---------|--------|
| `src/utils/exportActionsPDF.js` | jspdf | `.pdf` download |
| `src/utils/exportActionsExcel.js` | exceljs | `.xlsx` download |
| `src/utils/exportActionsNotion.js` | — (string) | Markdown in clipboard |
| `src/utils/shareActionsURL.js` | lz-string | URL in clipboard |
| `src/components/ui/export-actions-toolbar.jsx` | — | Toolbar UI |

### Input Data (common to all 4)

```
actions[]        — all actions for the set
phases[]         — ordered phases
krStatuses{}     — KR id → { text, team, objectiveTitle } map
selected{}       — selected objectives for context
setName          — OKR set name
```

## Format Specifications

### PDF (jspdf, ~2-3 pages)

- **Header**: Set name, date, summary stats (total actions, % done, total budget)
- **Table**: Title, Channel, Status, Priority, Phase, Start Date, End Date, Linked KRs
- **Grouped by phase** with phase name as section header and color accent
- **Footer**: page numbers

No Gantt chart capture — table only.

### Excel (exceljs, 2 sheets)

- **Sheet "Actions"**: All columns (title, description, channel, action_type, status, priority, assignee, start_date, end_date, budget_estimated, budget_actual, currency, phase, linked KRs as comma-separated text)
- **Sheet "Summary"**: Counts by status, by channel, by phase; budget totals (estimated vs actual)
- Styled headers, auto-width columns, freeze first row

### Notion (Markdown clipboard)

- H1: Set name
- Per phase: H2 with phase name, then Markdown table (Title | Channel | Status | Priority | Dates | KRs)
- Optimized for Notion paste (tables convert to Notion databases)

### Shareable URL (lz-string)

- Compresses `{ actions, phases }` with LZString.compressToEncodedURIComponent
- Appends as `?actions=<compressed>` query parameter
- On load, ActionsStep checks for this param and hydrates from it (read-only mode)
- Same pattern as existing `useShareableURL` for OKRs

## UI — ExportActionsToolbar

Placed in ActionsStep header, right-aligned, separated from view toggle buttons.

4 buttons:
- **PDF** (FileDown icon) — downloads immediately, toast feedback
- **Excel** (Sheet icon) — downloads immediately, toast feedback
- **Notion** (Copy icon) — copies to clipboard, button shows "Copied" for 2s
- **Link** (Link icon) — copies URL to clipboard, button shows "Copied" for 2s

States:
- Loading spinner during generation
- Disabled when 0 actions
- Success feedback (toast or inline "Copied" text)

## Decisions

- **No Gantt capture in PDF**: User chose table-only export for simplicity
- **No API integration for Notion**: Clipboard Markdown paste, same as OKR export
- **No CSV**: Not requested; Excel covers tabular needs
- **Compressed URL over public page**: No backend needed, works offline
- **4 separate modules over shared abstraction**: YAGNI — formats are too different
