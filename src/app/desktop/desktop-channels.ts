/**
 * The channel names of the desktop file channel (CHG-004), shared by the
 * main process (electron/files.ts) and the page (desktop-files.ts). The
 * preload (electron/preload.cjs) keeps its own copy of the list that may
 * pass.
 */
export const DesktopChannel = {
  TakePending: "gd-files:take-pending",
  OpenDialog: "gd-files:open-dialog",
  SaveDialog: "gd-files:save-dialog",
  Read: "gd-files:read",
  Write: "gd-files:write",
  Recent: "gd-files:recent",
  /** Main to page: documents to open now, as OpenDialog's records. */
  OpenFiles: "gd-files:open",
  /** Main to page: the recent list changed. */
  RecentChanged: "gd-files:recent-changed",
  /** Main to page: the window is closing, ask about unsaved documents. */
  CloseRequest: "gd-files:close-request",
  /** Page to main: whether the page can answer CloseRequest. */
  CloseGuard: "gd-files:close-guard",
  /** Page to main: every unsaved document is dealt with, close the window. */
  CloseConfirmed: "gd-files:close-confirmed",
} as const;
