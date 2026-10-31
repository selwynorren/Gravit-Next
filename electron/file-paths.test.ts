import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  addRecent,
  DEFAULT_WINDOW_SIZE,
  gvdesignArguments,
  sanitizeWindowState,
  stringList,
  withExtension,
  type Area,
} from "./file-paths.ts";

const screenArea: Area = { x: 0, y: 0, width: 1920, height: 1080 };

describe("gvdesignArguments", () => {
  const everything = (): boolean => true;

  it("takes the .gvdesign files, in order, as absolute paths", () => {
    expect(
      gvdesignArguments(
        ["/usr/bin/app", "--flag", "a.gvdesign", "/x/B.GVDESIGN"],
        "/work",
        everything,
      ),
    ).toEqual([path.resolve("/work", "a.gvdesign"), "/x/B.GVDESIGN"]);
  });

  it("skips other files, flags and files that do not exist", () => {
    const exists = (file: string): boolean => file.endsWith("real.gvdesign");
    expect(
      gvdesignArguments(
        ["app", "pic.png", "--x.gvdesign", "gone.gvdesign", "real.gvdesign"],
        "/w",
        exists,
      ),
    ).toEqual([path.resolve("/w", "real.gvdesign")]);
  });

  it("reads the file:// URLs a file manager passes", () => {
    expect(
      gvdesignArguments(
        ["app", "file:///home/me/My%20Logo.gvdesign", "file://bad host/x.gvdesign"],
        "/w",
        everything,
      ),
    ).toEqual(["/home/me/My Logo.gvdesign"]);
  });

  it("names a file once", () => {
    expect(gvdesignArguments(["a.gvdesign", "./a.gvdesign"], "/w", everything)).toEqual([
      path.resolve("/w", "a.gvdesign"),
    ]);
  });
});

describe("withExtension", () => {
  it("adds the extension the user left out", () => {
    expect(withExtension("/d/logo", ["gvdesign"])).toBe("/d/logo.gvdesign");
    expect(withExtension("/d/logo.v2", ["gvdesign"])).toBe("/d/logo.v2.gvdesign");
  });

  it("keeps a name that has one of the extensions, in any case", () => {
    expect(withExtension("/d/logo.gvdesign", ["gvdesign"])).toBe("/d/logo.gvdesign");
    expect(withExtension("/d/logo.JPEG", ["jpg", "jpeg"])).toBe("/d/logo.JPEG");
  });

  it("leaves an unfiltered dialog's name alone", () => {
    expect(withExtension("/d/logo", [])).toBe("/d/logo");
    expect(withExtension("/d/logo", ["*"])).toBe("/d/logo");
  });
});

describe("recent files", () => {
  it("puts the newest first and names a file once", () => {
    expect(addRecent(["/a", "/b", "/c"], "/b")).toEqual(["/b", "/a", "/c"]);
  });

  it("keeps at most the limit", () => {
    expect(addRecent(["/a", "/b"], "/c", 2)).toEqual(["/c", "/a"]);
  });

  it("reads only strings from a saved list", () => {
    expect(stringList(["/a", 1, null, "/b"])).toEqual(["/a", "/b"]);
    expect(stringList({ not: "a list" })).toEqual([]);
  });
});

describe("sanitizeWindowState", () => {
  it("keeps a saved size, place and maximized flag", () => {
    expect(
      sanitizeWindowState({ width: 1000, height: 700, x: 50, y: 60, isMaximized: true }, [
        screenArea,
      ]),
    ).toEqual({ width: 1000, height: 700, x: 50, y: 60, isMaximized: true });
  });

  it("starts with the default size without a usable saved state", () => {
    const expected = { ...DEFAULT_WINDOW_SIZE, isMaximized: false };
    expect(sanitizeWindowState(null, [screenArea])).toEqual(expected);
    expect(sanitizeWindowState({ width: "wide", height: 700 }, [screenArea])).toEqual(expected);
    expect(sanitizeWindowState({ width: 200, height: 100 }, [screenArea])).toEqual(expected);
  });

  it("drops a place that is on no display any more", () => {
    const state = sanitizeWindowState({ width: 1000, height: 700, x: 3000, y: 100 }, [screenArea]);
    expect(state).toEqual({ width: 1000, height: 700, isMaximized: false });
  });

  it("finds a place on a second display", () => {
    const second: Area = { x: 1920, y: 0, width: 1280, height: 1024 };
    const state = sanitizeWindowState({ width: 1000, height: 700, x: 2000, y: 100 }, [
      screenArea,
      second,
    ]);
    expect(state.x).toBe(2000);
  });
});
