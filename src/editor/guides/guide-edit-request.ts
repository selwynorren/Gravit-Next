// New (not in the old app): the Manage Guides dialog's trigger, from the
// community fork's guide tools (CHG-003).
/**
 * A double click on a guide line asks the app to open its Manage Guides
 * dialog. The editor layer imports nothing from the UI, so the request is
 * a plain DOM event on `window`, which src/app/dialogs/manage-guides-dialog.ts
 * listens for. A typed engine event would need a new class, and class
 * registration order decides the saved type ids.
 */
import type { Editor } from "../editor.ts";

export const GUIDE_EDIT_REQUEST = "gravit:guide-edit-request";

export interface GuideEditRequest {
  editor: Editor;
  isVertical: boolean;
  /** Index into the scene's `vgl` or `hgl` of the guide that was double clicked. */
  guideIndex: number;
}

export function requestGuideEdit(detail: GuideEditRequest): void {
  window.dispatchEvent(new CustomEvent<GuideEditRequest>(GUIDE_EDIT_REQUEST, { detail }));
}
