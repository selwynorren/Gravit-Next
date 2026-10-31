// New (not in the old app): double-click a guide to manage all guides, CHG-003.
/**
 * The Manage Guides dialog: every guide of the scene on both axes, each
 * with a remove button, and "+ Add" per axis. Saving writes both lists as
 * one undo step. A double click on a guide (select tool) opens it with that
 * guide's row outlined and focused.
 *
 * Enter commits the field it is pressed in; pressed again with no field
 * focused it saves and closes. The listener is on the capture phase: a bare
 * Enter with nothing focused never reached a bubble-phase window listener in
 * the Electron build.
 */
import { createElement } from "react";
import {
  GUIDE_EDIT_REQUEST,
  type GuideEditRequest,
} from "../../editor/guides/guide-edit-request.ts";
import { Dialog } from "./dialog.ts";
import { ManageGuidesView } from "./manage-guides-dialog-view.tsx";
import { saveGuides, type GuideRow, type GuideScene } from "./manage-guides.ts";
import { HtmlButton } from "./warn-linked-image-dialog-view.tsx";

export function openManageGuidesDialog(request: GuideEditRequest): void {
  const editor = request.editor;
  const scene = editor.getScene() as unknown as GuideScene;
  let horizontal: GuideRow[] = [];
  let vertical: GuideRow[] = [];
  let pendingCommitEnter = false;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Enter") {
      pendingCommitEnter = false;
      return;
    }
    if ((event.target as Element | null)?.closest(".g-guides-manage-row")) {
      pendingCommitEnter = true;
    } else if (pendingCommitEnter) {
      save();
    }
  };
  const save = (): void => {
    saveGuides(editor, scene, horizontal, vertical);
    dialog.close();
  };

  const dialog: Dialog = Dialog.create(
    createElement(ManageGuidesView, {
      scene,
      targetIsVertical: request.isVertical,
      targetIndex: request.guideIndex,
      onRows: (h: GuideRow[], v: GuideRow[]) => {
        horizontal = h;
        vertical = v;
      },
    }),
    {
      releaseOnClose: true,
      className: "g-guides-manage-dialog",
      buttons: [
        createElement(HtmlButton, { key: "save", html: "Save", type: "submit", onClick: save }),
        createElement(HtmlButton, { key: "cancel", html: "Cancel", onClick: () => dialog.close() }),
      ],
      openCallback() {
        window.addEventListener("keydown", onKeyDown, true);
        // Focus needs the elements to be in the document, so it waits for the open.
        const field = this.getContent().querySelector<HTMLInputElement>(
          ".g-guides-manage-row.target input",
        );
        if (field) {
          field.scrollIntoView({ block: "nearest" });
          field.focus();
          field.select();
        }
      },
      closeCallback() {
        window.removeEventListener("keydown", onKeyDown, true);
      },
    },
  );
  dialog.open(true);
}

/** Opens the dialog for every guide-edit request of the editor. */
export function installManageGuidesDialog(): void {
  window.addEventListener(GUIDE_EDIT_REQUEST, (event) => {
    openManageGuidesDialog((event as CustomEvent<GuideEditRequest>).detail);
  });
}
