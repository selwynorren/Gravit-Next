import type { Transform } from "../../../engine/math/transform.ts";
import { PDFMatrixOperator } from "./operator.ts";

/** `a b c d e f Tm`: sets the text matrix. */
export class PDFTextMatrix extends PDFMatrixOperator {
  constructor(transform: Transform) {
    super("Tm", transform);
  }
}
