import { EditorOptions } from "../editor-options.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

class PreserveAspectRatioAnnotationHandle extends IconAnnotation {
  getAnnotationOptions(): IconAnnotationOptions {
    return EditorOptions.annotationHandles.preserveAspectRatio;
  }
}

export const PreserveAspectRatioAnnotation = new PreserveAspectRatioAnnotationHandle();
