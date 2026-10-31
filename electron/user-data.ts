/**
 * Where the app keeps its settings: the userData folder. It is named
 * "Gravit Next" (the app's name), not after the npm package. Versions before
 * 2.0.0 used the package name `gravit-designer-local`; that folder is moved
 * to the new name on the first start, with everything in it (localStorage
 * and IndexedDB hold the settings and imported fonts, recent-files.json the
 * recent list, window-state.json the window), so nothing is lost.
 */
import fs from "node:fs";
import path from "node:path";

export const APP_NAME = "Gravit Next";
export const LEGACY_USER_DATA_NAME = "gravit-designer-local";

/**
 * The folder to use as userData, inside `appData` (~/.config on Linux).
 * Moves the legacy folder to the new name when only the legacy one exists.
 * If it cannot be moved the legacy folder is used as it is, so the settings
 * are never left behind.
 */
export function resolveUserDataDir(appData: string): string {
  const current = path.join(appData, APP_NAME);
  const legacy = path.join(appData, LEGACY_USER_DATA_NAME);
  if (fs.existsSync(current) || !fs.existsSync(legacy)) return current;
  try {
    fs.renameSync(legacy, current);
    return current;
  } catch (error) {
    console.warn("Cannot move the settings folder, keeping the old one:", error);
    return legacy;
  }
}
