import type { PdfJs, PdfTilingPatternClass } from "./pdfjs.ts";

const classes = new WeakMap<PdfJs, PdfTilingPatternClass>();

export function getTilingPatternClass(pdfjs: PdfJs): PdfTilingPatternClass {
  let TilingPattern = classes.get(pdfjs);
  if (!TilingPattern) {
    TilingPattern = class extends pdfjs.TilingPattern {
      clipBbox(): void {}
    };
    classes.set(pdfjs, TilingPattern);
  }
  return TilingPattern;
}
