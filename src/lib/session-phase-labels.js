/**
 * Human-readable session phase labels for Home open-sessions picker.
 * @see docs/view-specs/home.md#open-sessions-dialog
 */
export const SESSION_PHASE_LABELS = {
  importing: 'Importing',
  counting: 'Counting',
  reconciling: 'Reconciling',
  organizing: 'Organizing',
  updating_inventory: 'Updating inventory',
}

export function sessionPhaseLabel(phase) {
  return SESSION_PHASE_LABELS[phase] ?? phase
}
