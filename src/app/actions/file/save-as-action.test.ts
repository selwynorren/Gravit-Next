import { describe, expect, it } from "vitest";
import { Key } from "../../../engine/core/key.ts";
import { SaveAction } from "./save-action.ts";
import { SaveAsAction } from "./save-as-action.ts";

describe("the Save and Save As shortcuts (CHG-004)", () => {
  it("save is Ctrl/Cmd+S", () => {
    expect(SaveAction.SHORTCUT).toEqual([Key.Constant.META, "S"]);
  });

  it("save as .gvdesign is Ctrl/Cmd+Shift+S", () => {
    expect(new SaveAsAction("gvdesign").getShortcut()).toEqual([
      Key.Constant.SHIFT,
      Key.Constant.META,
      "S",
    ]);
  });

  it("the exports have no shortcut", () => {
    expect(new SaveAsAction("png").getShortcut()).toBeNull();
    expect(new SaveAsAction("svg").getShortcut()).toBeNull();
  });
});
