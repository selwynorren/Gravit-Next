/**
 * The desktop app: an embedded HTTP server (server/app.ts) on
 * 127.0.0.1:47823 and one window that loads the client from it, as a
 * plain web page (no Node in the page, no application menu). One instance
 * only. The software update channel is electron-updater (updater.ts,
 * preload.cjs). The files (native Open and Save As, recent files,
 * documents opened by the system, the close prompt, the window size, the
 * .gvdesign type on Linux) are files.ts, the window state below and
 * linux-mime.ts.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import type http from "node:http";
import os from "node:os";
import path from "node:path";
import { app, BrowserWindow, Menu, dialog, screen } from "electron";
import { createServer } from "../server/app.ts";
import { CLIENT_ROOT } from "../server/paths.ts";
import { brandingArgument, productName } from "./branding.ts";
import { sanitizeWindowState } from "./file-paths.ts";
import { DesktopFiles } from "./files.ts";
import { registerLinuxMime } from "./linux-mime.ts";
import { installUpdater } from "./updater.ts";

/**
 * Fixed port, so the page origin (http://127.0.0.1:47823) stays the same
 * across launches. localStorage and IndexedDB, where the settings and
 * imported fonts live, are partitioned by origin; a random port would
 * start every launch empty (#6). The old app used the same port since #6,
 * so its users keep their data.
 */
export const FIXED_PORT = 47823;
export const ORIGIN = `http://127.0.0.1:${FIXED_PORT}`;

let mainWindow: BrowserWindow | null = null;
let server: http.Server | null = null;
let files: DesktopFiles | null = null;
/** Documents the system named before the file handling was up (a second launch, macOS open-file). */
const earlyLaunches: { argv: readonly string[]; cwd: string }[] = [];
const earlyFiles: string[] = [];

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    server = createServer();
    // In the old app the license WebSocket server turned this error into
    // an uncaught exception before this handler ran (see BUG-130 "Port in
    // use: the friendly error box never shows" in BUGS-FIXED.md).
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        // A random port would change the origin and reset the settings, so
        // report the conflict instead.
        dialog.showErrorBox(
          productName(),
          `Port ${FIXED_PORT} is already in use. Another instance may be ` +
            `running, or another program is using the port. Close it and ` +
            `relaunch ${productName()}.`,
        );
      } else {
        dialog.showErrorBox(productName(), `Server error: ${err.message}`);
      }
      app.quit();
    });
    server.listen(FIXED_PORT, "127.0.0.1", () => {
      console.log(`Embedded server on ${ORIGIN}`);
      resolve(FIXED_PORT);
    });
  });
}

/** Where the window's size and place are kept between launches. */
function windowStateFile(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

function loadWindowState(): ReturnType<typeof sanitizeWindowState> {
  let raw: unknown = null;
  try {
    raw = JSON.parse(fs.readFileSync(windowStateFile(), "utf8"));
  } catch {
    // First start, or a file that is unreadable: the default size.
  }
  return sanitizeWindowState(
    raw,
    screen.getAllDisplays().map((display) => display.workArea),
  );
}

function saveWindowState(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  // The normal bounds are the size and place it has when it isn't maximized
  // or full screen, so restoring later un-maximizes to the right size.
  const state = { ...window.getNormalBounds(), isMaximized: window.isMaximized() };
  try {
    fs.writeFileSync(windowStateFile(), JSON.stringify(state));
  } catch (error) {
    console.warn("Cannot save the window state:", error);
  }
}

function createWindow(port: number): void {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 800,
    minHeight: 600,
    title: productName(),
    // The Gravit Next icon (public/brand/icons, scripts/brand/render-icons.ts).
    icon: path.join(CLIENT_ROOT, "brand", "icons", "icon-512.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Exposes only the update channel (window.gravitDesktop.updates) and,
      // with GD_BRANDING set, the look (window.__gdBranding, branding.ts).
      preload: path.join(import.meta.dirname, "..", "electron", "preload.cjs"),
      additionalArguments: brandingArgument(),
    },
    autoHideMenuBar: true,
  });
  Menu.setApplicationMenu(null);
  if (state.isMaximized) mainWindow.maximize();
  const window = mainWindow;
  let saveTimer: NodeJS.Timeout | null = null;
  const saveSoon = (): void => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveWindowState(window), 500);
  };
  window.on("resize", saveSoon);
  window.on("move", saveSoon);
  window.on("close", (event) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveWindowState(window);
    // With unsaved documents the page asks first and closes the window
    // itself when every one is saved or discarded.
    if (files && !files.allowsClose()) event.preventDefault();
  });
  // A discarded document is still modified, so the page's own "leave site?"
  // prompt (bootstrap.ts beforeUnload) would keep the window open.
  window.webContents.on("will-prevent-unload", (event) => {
    if (files?.closeConfirmed) event.preventDefault();
  });
  window.webContents.on("did-start-navigation", (details) => {
    if (details.isMainFrame && !details.isSameDocument) files?.pageLoading();
  });
  void window.loadURL(`http://127.0.0.1:${port}`);
  window.on("closed", () => {
    mainWindow = null;
  });
}

/** Runs a program and gives its output; null when it is missing or fails. */
function run(command: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 15_000 }, (error, stdout) => resolve(error ? null : stdout));
  });
}

// One instance only, so the fixed port is reliably ours. A second launch
// focuses the existing window and opens the documents it names.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv, cwd) => {
    if (files) files.openCommandLine(argv, cwd);
    else earlyLaunches.push({ argv, cwd });
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  // macOS hands a double clicked document over this way, not on the command line.
  app.on("open-file", (event, file) => {
    event.preventDefault();
    if (files) files.open([file]);
    else earlyFiles.push(file);
  });
  app.on("ready", async () => {
    files = new DesktopFiles(
      path.join(app.getPath("userData"), "recent-files.json"),
      () => mainWindow,
      ORIGIN,
    );
    files.register();
    files.openCommandLine(process.argv, process.cwd());
    for (const launch of earlyLaunches) files.openCommandLine(launch.argv, launch.cwd);
    if (earlyFiles.length) files.open(earlyFiles);
    if (process.platform === "linux" && app.isPackaged) {
      registerLinuxMime({
        dataHome: process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
        iconSource: path.join(CLIENT_ROOT, "brand", "icons"),
        appImage: process.env.APPIMAGE || null,
        productName: productName(),
        run,
      }).catch((error: unknown) => console.warn("Cannot register the .gvdesign type:", error));
    }
    installUpdater(() => mainWindow);
    const port = await startServer();
    createWindow(port);
  });
}

app.on("window-all-closed", () => {
  server?.close();
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    if (server) createWindow(FIXED_PORT);
    else void startServer().then(createWindow);
  }
});
