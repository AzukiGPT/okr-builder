// src/lib/navigation.js
// Sidebar section config with bidirectional step mapping.
// Step components remain unaware of this layer.

export const SECTIONS = [
  { id: "company", label: "Company", icon: "Building2" },
  {
    id: "okrs",
    label: "OKRs",
    icon: "Target",
    subPages: [
      { id: "context", label: "Context", step: 0 },
      { id: "objectives", label: "Objectives", step: 1 },
      { id: "funnel", label: "Funnel", step: 2 },
      { id: "system", label: "System", step: 3 },
    ],
  },
  { id: "plan-marketing", label: "Plan marketing", icon: "Rocket", step: 4, requiresSet: true },
  { id: "marketing-assets", label: "Assets marketing", icon: "Palette", placeholder: true },
]

/** Given a step integer (when activeSetId is set and no activePage),
 *  return { sectionId, subPageId? } */
export function getActiveSectionForStep(step) {
  if (step === 4) return { sectionId: "plan-marketing" }
  for (const section of SECTIONS) {
    if (section.subPages) {
      const sub = section.subPages.find((sp) => sp.step === step)
      if (sub) return { sectionId: section.id, subPageId: sub.id }
    }
  }
  return { sectionId: "okrs", subPageId: "context" }
}

/** Check if a step belongs to the OKRs section (step 0-3) */
export function isOKRStep(step) {
  return step >= 0 && step <= 3
}
