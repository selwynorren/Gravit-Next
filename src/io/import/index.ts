import { BitmapImport } from "./bitmap-import.ts";
import { EPSImport } from "./eps/eps-import.ts";
import { PDFImport } from "./pdf/pdf-import.ts";
import { SketchImport } from "./sketch/sketch-import.ts";
import { SVGImport } from "./svg/svg-import.ts";

export const Importers = {
  GSVGImport: SVGImport,
  GPDFImport: PDFImport,
  GSketchImport: SketchImport,
  GEPSImport: EPSImport,
  GBitmapImport: BitmapImport,
};

export { BitmapImport, EPSImport, PDFImport, SketchImport, SVGImport };
