import { PDFArray } from "./pdf-array.ts";
import { PDFNumber } from "./pdf-number.ts";
import { PDFObject } from "./pdf-object.ts";
import type { PDFOutput } from "./output.ts";

/**
 * A page box, in PDF coordinates (from the lower left corner), written as
 * PDF expects it: `[llx lly urx ury]`. The old code wrote
 * `[top left width height]`, which only came out right for boxes at 0 0
 *.
 */
export class PDFMediaBox extends PDFObject {
  declare left: number;
  declare top: number;
  declare width: number;
  declare height: number;

  constructor(left: number, top: number, width: number, height: number) {
    super();
    this.top = top;
    this.left = left;
    this.width = width;
    this.height = height;
  }

  /** A y coordinate measured from the bottom of the page, as PDF counts. */
  relativeY(y: number): number {
    return PDFNumber.normalizeNumber(this.height - y);
  }

  override write(output: PDFOutput): void {
    const array = new PDFArray();
    array.push(this.left);
    array.push(this.top);
    array.push(PDFNumber.normalizeNumber(this.left + this.width));
    array.push(PDFNumber.normalizeNumber(this.top + this.height));
    array.write(output);
  }
}

Object.assign(PDFMediaBox.prototype, { left: null, top: null, width: null, height: null });
