/**
 * HUIT DRL Application Feature Flags & Configuration
 * 
 * Target Persona & Philosophy:
 * - This application is a personal DRL notebook and tracking companion for students.
 * - Students use it to self-record activities, track current scores per HUIT QĐ 3385, and retain proof files.
 * - Administrative school submission workflows, class committees, and appeal dossiers are disabled by default
 *   to keep the interface fast, uncluttered, and personal.
 */

export const APP_FEATURES = {
  // Submission workflow: Disabled because students track personal notes, not an admin portal
  ENABLE_SUBMISSION_WORKFLOW: false,

  // Class meeting minutes: Disabled for students (only used in admin/advisor mode if enabled)
  ENABLE_CLASS_MEETINGS: false,

  // Formal appeal dossier: Disabled for standard personal note-taking
  ENABLE_APPEAL_DOSSIER: false,

  // Review & audit approval tags: Disabled to avoid administrative review bloat in personal log
  ENABLE_AUDIT_STATUS_TAGS: false,

  // Multi-semester forecasting & goals: Enabled as personal self-improvement tools
  ENABLE_GOAL_TRACKER: true,
  ENABLE_RADAR_BALANCE: true,
  ENABLE_PROOF_VAULT: true,
};

