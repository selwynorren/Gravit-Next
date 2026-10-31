import type { SketchMetaData } from "./sketch-data.ts";
import { SketchParser } from "./sketch-parser.ts";

export class SketchMeta extends SketchParser<SketchMetaData> {
  declare version: number | null;

  override parse(): void {
    this.version = parseFloat(this._data.appVersion as string);
  }
}

SketchMeta.prototype.version = null;
