import { describe, expect, it } from "vitest";
import { Scene } from "../../engine/scene/scene.ts";
import {
  evaluatedText,
  guideRows,
  parseGuideRows,
  saveGuides,
  UNDO_NAME,
  type GuideRow,
  type GuideScene,
} from "./manage-guides.ts";

function sceneWith(hgl: number[] | null, vgl: number[] | null): Scene {
  const scene = new Scene();
  scene.setProperties(["hgl", "vgl"], [hgl, vgl]);
  return scene;
}

function row(text: string, seedIndex: number | null = null): GuideRow {
  return { key: 0, text, seedIndex };
}

describe("manage guides", () => {
  it("lists the guides of an axis with their index", () => {
    const rows = guideRows(sceneWith([10, 20.5], [7]), false);
    expect(rows.map((r) => [r.text, r.seedIndex])).toEqual([
      ["10", 0],
      ["20.5", 1],
    ]);
    expect(guideRows(sceneWith([10, 20.5], [7]), true).map((r) => r.text)).toEqual(["7"]);
  });

  it("lists nothing for a scene without guides", () => {
    expect(guideRows(sceneWith(null, null), false)).toEqual([]);
  });

  it("shows and reads positions from the ruler origin", () => {
    const scene = sceneWith([110], [250]);
    scene.setProperties(["rox", "roy"], [200, 100]);
    // x is 250 on the page, 50 from the origin; y is 110, 10 from it.
    expect(guideRows(scene, true).map((r) => r.text)).toEqual(["50"]);
    expect(guideRows(scene, false).map((r) => r.text)).toEqual(["10"]);
    expect(parseGuideRows(scene, [row("50")], true)).toEqual([250]);
    expect(parseGuideRows(scene, [row("10")], false)).toEqual([110]);
    expect(evaluatedText(scene, "20+30", true)).toBe("50");
  });

  it("saves origin-relative rows as page positions", () => {
    const scene = sceneWith(null, null);
    scene.setProperties(["rox", "roy"], [200, 100]);
    const editor = { beginTransaction: () => {}, commitTransaction: () => {} };
    saveGuides(editor, scene, [row("10")], [row("50")]);
    expect(scene.getProperty("hgl")).toEqual([110]);
    expect(scene.getProperty("vgl")).toEqual([250]);
  });

  it("evaluates a typed expression", () => {
    const scene = sceneWith(null, null);
    expect(evaluatedText(scene, "87+95", false)).toBe("182");
    expect(evaluatedText(scene, "not a length", true)).toBeNull();
  });

  it("leaves out rows that are not a length", () => {
    const scene = sceneWith(null, null);
    expect(parseGuideRows(scene, [row("5"), row(""), row("abc"), row("87+95")], false)).toEqual([
      5, 182,
    ]);
  });

  it("saves both axes in one transaction", () => {
    const scene = sceneWith([1], [2]);
    const calls: string[] = [];
    const editor = {
      beginTransaction: () => calls.push("begin"),
      commitTransaction: (name: string) => calls.push("commit " + name),
    };
    const original = scene.setProperties.bind(scene);
    (scene as GuideScene).setProperties = (names, values) => {
      calls.push("set " + names.join(","));
      original(names, values);
    };
    saveGuides(editor, scene, [row("30"), row("40")], [row("50")]);
    expect(calls).toEqual(["begin", "set hgl,vgl", "commit " + UNDO_NAME]);
    expect(scene.getProperty("hgl")).toEqual([30, 40]);
    expect(scene.getProperty("vgl")).toEqual([50]);
  });

  it("commits the transaction even when the write throws", () => {
    const calls: string[] = [];
    const editor = {
      beginTransaction: () => calls.push("begin"),
      commitTransaction: () => calls.push("commit"),
    };
    const scene = sceneWith(null, null);
    scene.setProperties = () => {
      throw new Error("boom");
    };
    expect(() => saveGuides(editor, scene, [row("1")], [])).toThrow("boom");
    expect(calls).toEqual(["begin", "commit"]);
  });
});
