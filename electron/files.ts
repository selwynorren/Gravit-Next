/**
 * The desktop app's files (CHG-004): the native Open and Save As dialogs,
 * reading and writing the files on disk, the recent files, and the
 * documents handed over by the system (a double click, "Open with", the
 * command line, a second launch).
 *
 * The page talks to this through window.gravitDesktop.files (preload.cjs,
 * src/app/desktop/desktop-files.ts). It may read and write only paths that
 * it was given here: chosen in a dialog, named on the command line or in
 * the recent list. Everything is kept in userData/recent-files.json.
 */
import fs from "node:fs";
import path from "node:path";
import { dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from "electron";
import { DesktopChannel as Channel } from "../src/app/desktop/desktop-channels.ts";
import { addRecent, gvdesignArguments, stringList, withExtension } from "./file-paths.ts";

export interface FileRecord {
  path: string;
  name: string;
  data: Uint8Array;
}

interface Filter {
  name: string;
  extensions: string[];
}

interface SavedState {
  recent: string[];
  lastDirectory: string | null;
}

function filters(value: unknown): Filter[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (!entry || "object" !== typeof entry) return [];
    const { name, extensions } = entry as { name?: unknown; extensions?: unknown };
    const list = stringList(extensions);
    return list.length
      ? [{ name: "string" === typeof name ? name : list.join(", "), extensions: list }]
      : [];
  });
}

export class DesktopFiles {
  private _recent: string[] = [];
  private _lastDirectory: string | null = null;
  /** The paths the page may read and write. */
  private readonly _allowed = new Set<string>();
  private _pending: string[] = [];
  private _closeGuard = false;
  private _closeConfirmed = false;
  /** The page has started (it asked for the pending documents) and listens for the rest. */
  private _pageReady = false;

  constructor(
    private readonly _stateFile: string,
    private readonly _window: () => BrowserWindow | null,
    private readonly _origin: string,
  ) {
    try {
      const saved = JSON.parse(fs.readFileSync(_stateFile, "utf8")) as Partial<SavedState> | null;
      this._recent = stringList(saved?.recent);
      this._lastDirectory = "string" === typeof saved?.lastDirectory ? saved.lastDirectory : null;
    } catch {
      // No file yet, or one that is unreadable: start empty.
    }
    for (const file of this._recent) this._allowed.add(file);
  }

  /** The recent files that still exist, newest first. */
  recent(): string[] {
    return this._recent.filter((file) => fs.existsSync(file));
  }

  /** Remembers the documents the system asked for; the page takes them when it starts. */
  queueOpen(files: readonly string[]): void {
    for (const file of files) this._allowed.add(file);
    this._pending.push(...files);
  }

  /** The page is loading (again): it is not listening and cannot guard the close. */
  pageLoading(): void {
    this._pageReady = false;
    this._closeGuard = false;
    this._closeConfirmed = false;
  }

  /** Opens `files` in the running page, or queues them while it is still starting. */
  open(files: readonly string[]): void {
    const window = this._window();
    if (!window || !this._pageReady) {
      this.queueOpen(files);
      return;
    }
    for (const file of files) this._allowed.add(file);
    const records = this._records(files);
    if (records.length) window.webContents.send(Channel.OpenFiles, records);
  }

  /** The command line of this or a second launch: opens what it names. */
  openCommandLine(argv: readonly string[], cwd: string): void {
    const files = gvdesignArguments(argv, cwd, fs.existsSync);
    if (files.length) this.open(files);
  }

  /**
   * Called for the window's "close" event: true when the window may close.
   * Otherwise the page is asked to deal with unsaved documents first and
   * answers with CloseConfirmed.
   */
  allowsClose(): boolean {
    const window = this._window();
    if (this._closeConfirmed || !this._closeGuard || !window) return true;
    window.webContents.send(Channel.CloseRequest);
    return false;
  }

  /** True once the page said every unsaved document is dealt with. */
  get closeConfirmed(): boolean {
    return this._closeConfirmed;
  }

  register(): void {
    const trusted =
      (handler: (event: IpcMainInvokeEvent, payload: unknown) => unknown) =>
      (event: IpcMainInvokeEvent, payload: unknown): unknown => {
        if (!event.sender.getURL().startsWith(this._origin))
          throw new Error("Not allowed from this page.");
        return handler(event, payload);
      };

    ipcMain.handle(
      Channel.TakePending,
      trusted(() => {
        this._pageReady = true;
        const files = this._pending;
        this._pending = [];
        return this._records(files);
      }),
    );
    ipcMain.handle(
      Channel.Recent,
      trusted(() => this.recent()),
    );
    ipcMain.handle(
      Channel.OpenDialog,
      trusted(async (_event, payload) => {
        const { filters: types, multiple } = (payload ?? {}) as {
          filters?: unknown;
          multiple?: unknown;
        };
        const options: Electron.OpenDialogOptions = {
          defaultPath: this._lastDirectory ?? undefined,
          properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
          filters: filters(types),
        };
        const window = this._window();
        const result = window
          ? await dialog.showOpenDialog(window, options)
          : await dialog.showOpenDialog(options);
        if (result.canceled) return [];
        for (const file of result.filePaths) this._allowed.add(file);
        return this._records(result.filePaths);
      }),
    );
    ipcMain.handle(
      Channel.SaveDialog,
      trusted(async (_event, payload) => {
        const { name, filters: types } = (payload ?? {}) as { name?: unknown; filters?: unknown };
        const list = filters(types);
        const options: Electron.SaveDialogOptions = {
          defaultPath: path.join(this._lastDirectory ?? "", "string" === typeof name ? name : ""),
          filters: list,
        };
        const window = this._window();
        const result = window
          ? await dialog.showSaveDialog(window, options)
          : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath) return null;
        const file = withExtension(
          result.filePath,
          list.flatMap((filter) => filter.extensions),
        );
        this._allowed.add(file);
        this._lastDirectory = path.dirname(file);
        this._save();
        return file;
      }),
    );
    ipcMain.handle(
      Channel.Read,
      trusted(async (_event, payload) => {
        const file = this._allowedPath(payload);
        return new Uint8Array(await fs.promises.readFile(file));
      }),
    );
    ipcMain.handle(
      Channel.Write,
      trusted(async (_event, payload) => {
        const { path: target, data } = (payload ?? {}) as { path?: unknown; data?: unknown };
        const file = this._allowedPath(target);
        if (!(data instanceof Uint8Array)) throw new Error("No data to write.");
        await fs.promises.writeFile(file, data);
        this._remember(file);
      }),
    );
    ipcMain.on(Channel.CloseGuard, (event, enabled: unknown) => {
      if (event.sender.getURL().startsWith(this._origin)) this._closeGuard = enabled === true;
    });
    ipcMain.on(Channel.CloseConfirmed, (event) => {
      if (!event.sender.getURL().startsWith(this._origin)) return;
      this._closeConfirmed = true;
      this._window()?.close();
    });
  }

  private _allowedPath(value: unknown): string {
    if ("string" !== typeof value || !this._allowed.has(value))
      throw new Error("This file was not chosen.");
    return value;
  }

  /** Reads `files` for the page; one that cannot be read is skipped. */
  private _records(files: readonly string[]): FileRecord[] {
    const records: FileRecord[] = [];
    for (const file of files) {
      try {
        records.push({
          path: file,
          name: path.basename(file),
          data: new Uint8Array(fs.readFileSync(file)),
        });
        this._remember(file);
      } catch (error) {
        console.warn(`Cannot read ${file}:`, error);
      }
    }
    return records;
  }

  private _remember(file: string): void {
    this._recent = addRecent(this._recent, file);
    this._lastDirectory = path.dirname(file);
    this._save();
    this._window()?.webContents.send(Channel.RecentChanged, this.recent());
  }

  private _save(): void {
    const state: SavedState = { recent: this._recent, lastDirectory: this._lastDirectory };
    try {
      fs.writeFileSync(this._stateFile, JSON.stringify(state));
    } catch (error) {
      console.warn("Cannot save the recent files:", error);
    }
  }
}
