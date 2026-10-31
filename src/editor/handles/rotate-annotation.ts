import { EditorOptions } from "../editor-options.ts";
import { IconAnnotation, type IconAnnotationOptions } from "./icon-annotation.ts";

class RotateAnnotationHandle extends IconAnnotation {
  getAnnotationOptions(): IconAnnotationOptions {
    return EditorOptions.annotationHandles.rotate;
  }
}

export const RotateAnnotation = new RotateAnnotationHandle();
