import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DESKTOP_FILE,
  desktopEntry,
  MIME_FILE,
  MIME_ICON_NAME,
  MIME_TYPE,
  registerLinuxMime,
  type Run,
} from "./linux-mime.ts";

let root: string;
let dataHome: string;
let iconSource: string;
let calls: string[];

/** Records the commands; `defaultApp` is what `xdg-mime query default` answers. */
function recorder(defaultApp: string | null): Run {
  return (command, args) => {
    calls.push([command, ...args].join(" "));
    return Promise.resolve(command === "xdg-mime" && args[0] === "query" ? defaultApp : "");
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "gd-mime-"));
  dataHome = path.join(root, "share");
  iconSource = path.join(root, "icons");
  fs.mkdirSync(iconSource);
  for (const size of [16, 512])
    fs.writeFileSync(path.join(iconSource, `icon-${size}.png`), "png" + size);
  calls = [];
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const options = (appImage: string | null, run: Run) => ({
  dataHome,
  iconSource,
  appImage,
  productName: "Gravit Next",
  run,
});

describe("registerLinuxMime", () => {
  it("installs the type and the icons it has files for", async () => {
    await registerLinuxMime(options(null, recorder(null)));
    const xml = fs.readFileSync(path.join(dataHome, "mime", "packages", MIME_FILE), "utf8");
    expect(xml).toContain(`type="${MIME_TYPE}"`);
    expect(xml).toContain('<glob pattern="*.gvdesign"/>');
    const icon = (size: number): string =>
      path.join(
        dataHome,
        "icons",
        "hicolor",
        `${size}x${size}`,
        "mimetypes",
        `${MIME_ICON_NAME}.png`,
      );
    expect(fs.readFileSync(icon(16), "utf8")).toBe("png16");
    expect(fs.readFileSync(icon(512), "utf8")).toBe("png512");
    expect(fs.existsSync(icon(48))).toBe(false);
    expect(calls).toEqual([
      `update-mime-database ${path.join(dataHome, "mime")}`,
      `gtk-update-icon-cache -f -t ${path.join(dataHome, "icons", "hicolor")}`,
    ]);
  });

  it("does nothing the second time", async () => {
    await registerLinuxMime(options(null, recorder(null)));
    calls = [];
    await registerLinuxMime(options(null, recorder(null)));
    expect(calls).toEqual([]);
  });

  it("makes the AppImage the program for the type, with a hidden launcher", async () => {
    await registerLinuxMime(options("/home/me/Gravit Next.AppImage", recorder(null)));
    const launcher = fs.readFileSync(path.join(dataHome, "applications", DESKTOP_FILE), "utf8");
    expect(launcher).toContain('Exec="/home/me/Gravit Next.AppImage" %F');
    expect(launcher).toContain("NoDisplay=true");
    expect(calls).toContain(`xdg-mime default ${DESKTOP_FILE} ${MIME_TYPE}`);
  });

  it("leaves the program the user chose", async () => {
    fs.mkdirSync(path.join(dataHome, "applications"), { recursive: true });
    fs.writeFileSync(path.join(dataHome, "applications", "other.desktop"), "[Desktop Entry]\n");
    await registerLinuxMime(options("/a.AppImage", recorder("other.desktop")));
    expect(calls.some((call) => call.startsWith("xdg-mime default"))).toBe(false);
  });

  it("takes the default from a program that is no longer installed", async () => {
    await registerLinuxMime({
      ...options("/a.AppImage", recorder("gone.desktop")),
      applicationDirs: [path.join(dataHome, "applications")],
    });
    expect(calls).toContain(`xdg-mime default ${DESKTOP_FILE} ${MIME_TYPE}`);
  });

  it("points the launcher at the AppImage's new place", async () => {
    await registerLinuxMime(options("/old.AppImage", recorder(null)));
    await registerLinuxMime(options("/new.AppImage", recorder(DESKTOP_FILE)));
    const launcher = fs.readFileSync(path.join(dataHome, "applications", DESKTOP_FILE), "utf8");
    expect(launcher).toContain('Exec="/new.AppImage" %F');
  });

  it("does not make a launcher outside an AppImage", async () => {
    await registerLinuxMime(options(null, recorder(null)));
    expect(fs.existsSync(path.join(dataHome, "applications"))).toBe(false);
  });
});

describe("desktopEntry", () => {
  it("escapes what a quoted Exec value must", () => {
    expect(desktopEntry('/a"b$c.AppImage', "App")).toContain('Exec="/a\\"b\\$c.AppImage" %F');
  });
});
