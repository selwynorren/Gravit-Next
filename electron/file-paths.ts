/**
 * The pure parts of the desktop file handling (CHG-004): which command line
 * arguments are documents, the extension a Save As adds, the recent files
 * list and the saved window state. Nothing here touches Electron, so it
 * runs in the unit tests; files.ts and main.ts do the I/O.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GVDESIGN_EXTENSION = "gvdesign";
export const MAX_RECENT_FILES = 10;

/**
 * The .gvdesign files a command line names, as absolute paths in the order
 * given, once each. `cwd` is the directory the command was started in (a
 * second instance reports its own). A file manager passes `file://` URLs
 * (the %U of the launcher). Arguments that are not existing .gvdesign
 * files, flags included, are skipped.
 */
export function gvdesignArguments(
  argv: readonly string[],
  cwd: string,
  exists: (file: string) => boolean,
): string[] {
  const found: string[] = [];
  for (const argument of argv) {
    if (argument.startsWith("-")) continue;
    if (path.extname(argument).toLowerCase() !== "." + GVDESIGN_EXTENSION) continue;
    let file: string;
    try {
      file = argument.startsWith("file://") ? fileURLToPath(argument) : path.resolve(cwd, argument);
    } catch {
      continue;
    }
    if (!found.includes(file) && exists(file)) found.push(file);
  }
  return found;
}

/**
 * `file` with the first of `extensions` added when the user typed none of
 * them. The Linux save dialog does not add the extension of the chosen
 * filter itself. No extensions (an unfiltered dialog) leaves the name alone.
 */
export function withExtension(file: string, extensions: readonly string[]): string {
  const first = extensions[0];
  if (!first || first === "*") return file;
  const typed = path.extname(file).slice(1).toLowerCase();
  if (extensions.some((extension) => extension.toLowerCase() === typed)) return file;
  return file + "." + first;
}

/** `list` with `file` first, once, at most `max` entries. */
export function addRecent(list: readonly string[], file: string, max = MAX_RECENT_FILES): string[] {
  return [file, ...list.filter((other) => other !== file)].slice(0, max);
}

/** The strings of a parsed JSON value, or nothing for anything else. */
export function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => "string" === typeof entry)
    : [];
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_WINDOW_SIZE = { width: 1400, height: 900 };
/** The window's minimum size (main.ts), which a saved size must not undercut. */
export const MIN_WINDOW_SIZE = { width: 800, height: 600 };

/**
 * The window state saved last time, made safe to use. A saved size below
 * the minimum, or not a number, is dropped; a saved position is dropped
 * unless its top-left corner is on one of the `areas` (the work areas of
 * the displays), as after an external monitor was unplugged.
 */
export function sanitizeWindowState(raw: unknown, areas: readonly Area[]): WindowState {
  const fallback: WindowState = { ...DEFAULT_WINDOW_SIZE, isMaximized: false };
  if (!raw || "object" !== typeof raw) return fallback;
  const saved = raw as Record<string, unknown>;
  const number = (value: unknown): number | null =>
    "number" === typeof value && Number.isFinite(value) ? value : null;
  const width = number(saved.width);
  const height = number(saved.height);
  if (
    width === null ||
    height === null ||
    width < MIN_WINDOW_SIZE.width ||
    height < MIN_WINDOW_SIZE.height
  )
    return fallback;
  const state: WindowState = { width, height, isMaximized: saved.isMaximized === true };
  const x = number(saved.x);
  const y = number(saved.y);
  if (
    x !== null &&
    y !== null &&
    areas.some(
      (area) => x >= area.x && y >= area.y && x < area.x + area.width && y < area.y + area.height,
    )
  ) {
    state.x = x;
    state.y = y;
  }
  return state;
}
