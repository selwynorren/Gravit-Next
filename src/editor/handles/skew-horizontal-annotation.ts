import { EditorOptions } from "../editor-options.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

class SkewHorizontalAnnotationHandle extends IconAnnotation {
  getAnnotationOptions(): IconAnnotationOptions {
    return EditorOptions.annotationHandles.tranformBox.skew;
  }
}

export const SkewHorizontalAnnotation = new SkewHorizontalAnnotationHandle();
