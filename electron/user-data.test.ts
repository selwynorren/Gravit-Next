import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_NAME, LEGACY_USER_DATA_NAME, resolveUserDataDir } from "./user-data.ts";

let appData = "";

beforeEach(() => {
  appData = fs.mkdtempSync(path.join(os.tmpdir(), "gn-userdata-"));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(appData, { recursive: true, force: true });
});

const legacy = (): string => path.join(appData, LEGACY_USER_DATA_NAME);
const current = (): string => path.join(appData, APP_NAME);

describe("the settings folder", () => {
  it("is named after the app", () => {
    expect(APP_NAME).toBe("Gravit Next");
  });

  it("is the new name on a first install, and nothing is created yet", () => {
    expect(resolveUserDataDir(appData)).toBe(current());
    expect(fs.readdirSync(appData)).toEqual([]);
  });

  it("moves the old folder to the new name with everything in it", () => {
    fs.mkdirSync(path.join(legacy(), "Local Storage"), { recursive: true });
    fs.writeFileSync(path.join(legacy(), "recent-files.json"), '["a.gvdesign"]');
    fs.writeFileSync(path.join(legacy(), "Local Storage", "data"), "settings");
    expect(resolveUserDataDir(appData)).toBe(current());
    expect(fs.existsSync(legacy())).toBe(false);
    expect(fs.readFileSync(path.join(current(), "recent-files.json"), "utf8")).toBe(
      '["a.gvdesign"]',
    );
    expect(fs.readFileSync(path.join(current(), "Local Storage", "data"), "utf8")).toBe("settings");
  });

  it("uses the new folder and leaves the old one alone when both exist", () => {
    fs.mkdirSync(legacy());
    fs.mkdirSync(current());
    fs.writeFileSync(path.join(legacy(), "old.txt"), "old");
    expect(resolveUserDataDir(appData)).toBe(current());
    expect(fs.existsSync(path.join(legacy(), "old.txt"))).toBe(true);
  });

  it("keeps using the old folder when it cannot be moved", () => {
    fs.mkdirSync(legacy());
    vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("EACCES");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveUserDataDir(appData)).toBe(legacy());
    expect(fs.existsSync(legacy())).toBe(true);
  });
});
