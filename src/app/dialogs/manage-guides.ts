// New (not in the old app): the Manage Guides dialog's model, CHG-003.
/**
 * What the Manage Guides dialog edits: one list of guide positions per
 * axis (the scene's `hgl` and `vgl`), shown as text in the scene's unit.
 * Kept apart from the React view so the reading and saving are testable.
 */

/** The parts of the scene and the editor the dialog uses. */
export interface GuideScene {
  getProperty(name: string): unknown;
  setProperties(names: string[], values: unknown[]): void;
  getOptimalDecimalsCount(unit?: string | null): number;
  /** Positions on the page, shown from the ruler origin (CHG-003). */
  pointToStringX(value: number, decimals?: number): string;
  pointToStringY(value: number, decimals?: number): string;
  stringToPointX(text: string): number | null;
  stringToPointY(text: string): number | null;
}

export interface GuideTransactions {
  beginTransaction(): void;
  commitTransaction(name: string): void;
}

export interface GuideRow {
  /** Stable React key; rows are added and removed, so the index will not do. */
  key: number;
  /** The text of the field, in the scene's unit. */
  text: string;
  /** The guide's index in the scene when the dialog opened; null for a row added since. */
  seedIndex: number | null;
}

export const UNDO_NAME = "Change guides";

let nextKey = 1;

export function newGuideKey(): number {
  return nextKey++;
}

/** The rows for the guides the scene has on one axis. */
export function guideRows(scene: GuideScene, isVertical: boolean): GuideRow[] {
  const values = (scene.getProperty(isVertical ? "vgl" : "hgl") as number[] | null) ?? [];
  const decimals = scene.getOptimalDecimalsCount();
  return values.map((value, index) => ({
    key: newGuideKey(),
    text: isVertical
      ? scene.pointToStringX(value, decimals)
      : scene.pointToStringY(value, decimals),
    seedIndex: index,
  }));
}

/**
 * The positions the rows hold. A row whose text is not a length is left out,
 * as an empty field is: saving never writes NaN into a document.
 */
export function parseGuideRows(
  scene: GuideScene,
  rows: readonly GuideRow[],
  isVertical: boolean,
): number[] {
  const positions: number[] = [];
  for (const row of rows) {
    const value = isVertical ? scene.stringToPointX(row.text) : scene.stringToPointY(row.text);
    if (typeof value === "number" && Number.isFinite(value)) positions.push(value);
  }
  return positions;
}

/** Writes both lists as one undo step. */
export function saveGuides(
  editor: GuideTransactions,
  scene: GuideScene,
  horizontal: readonly GuideRow[],
  vertical: readonly GuideRow[],
): void {
  const hgl = parseGuideRows(scene, horizontal, false);
  const vgl = parseGuideRows(scene, vertical, true);
  editor.beginTransaction();
  try {
    scene.setProperties(["hgl", "vgl"], [hgl, vgl]);
  } finally {
    editor.commitTransaction(UNDO_NAME);
  }
}

/** The text a typed value shows once it is evaluated ("87+95" becomes "182"); null if it is not a length. */
export function evaluatedText(scene: GuideScene, text: string, isVertical: boolean): string | null {
  const value = isVertical ? scene.stringToPointX(text) : scene.stringToPointY(text);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const decimals = scene.getOptimalDecimalsCount();
  return isVertical ? scene.pointToStringX(value, decimals) : scene.pointToStringY(value, decimals);
}
