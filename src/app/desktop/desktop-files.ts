/**
 * The desktop app's file channel as the page sees it (CHG-004): the main
 * window's preload (electron/preload.cjs) puts window.gravitDesktop.files
 * on the page; electron/files.ts answers it. In a browser there is no such
 * object and none of this is used.
 *
 * A file the main process gave us is a FileHandleLike over its path, so
 * the browser storage's items (BrowserFileItem) read and write it without
 * knowing the difference.
 */
import type { FileHandleLike, WritableLike } from "../storage/file-system-access.ts";
import type { StorageFileType } from "../storage/storage.ts";
import { DesktopChannel } from "./desktop-channels.ts";

export interface DesktopFileRecord {
  path: string;
  name: string;
  data: Uint8Array;
}

export interface DesktopFilter {
  name: string;
  extensions: string[];
}

/** window.gravitDesktop.files, the raw channel. */
export interface RawFilesChannel {
  invoke(channel: string, payload?: unknown): Promise<unknown>;
  send(channel: string, payload?: unknown): void;
  on(channel: string, listener: (data: unknown) => void): void;
}

/** The typed calls of the file channel. */
export class DesktopFilesBridge {
  constructor(private readonly _channel: RawFilesChannel) {}

  async takePending(): Promise<DesktopFileRecord[]> {
    return (await this._channel.invoke(DesktopChannel.TakePending)) as DesktopFileRecord[];
  }

  async recent(): Promise<string[]> {
    return (await this._channel.invoke(DesktopChannel.Recent)) as string[];
  }

  async openDialog(filters: DesktopFilter[], multiple: boolean): Promise<DesktopFileRecord[]> {
    return (await this._channel.invoke(DesktopChannel.OpenDialog, {
      filters,
      multiple,
    })) as DesktopFileRecord[];
  }

  /** The chosen path (with the extension added), or null when cancelled. */
  async saveDialog(name: string, filters: DesktopFilter[]): Promise<string | null> {
    return (await this._channel.invoke(DesktopChannel.SaveDialog, { name, filters })) as
      string | null;
  }

  async read(path: string): Promise<Uint8Array> {
    return (await this._channel.invoke(DesktopChannel.Read, path)) as Uint8Array;
  }

  async write(path: string, data: Uint8Array): Promise<void> {
    await this._channel.invoke(DesktopChannel.Write, { path, data });
  }

  onOpen(listener: (records: DesktopFileRecord[]) => void): void {
    this._channel.on(DesktopChannel.OpenFiles, (data) => listener(data as DesktopFileRecord[]));
  }

  onRecentChanged(listener: (paths: string[]) => void): void {
    this._channel.on(DesktopChannel.RecentChanged, (data) => listener(data as string[]));
  }

  onCloseRequest(listener: () => void): void {
    this._channel.on(DesktopChannel.CloseRequest, () => listener());
  }

  /** Whether the window may ask this page about unsaved documents before it closes. */
  setCloseGuard(enabled: boolean): void {
    this._channel.send(DesktopChannel.CloseGuard, enabled);
  }

  confirmClose(): void {
    this._channel.send(DesktopChannel.CloseConfirmed);
  }
}

/** The file channel of the desktop app, or null in a browser. */
export function desktopFilesBridge(): DesktopFilesBridge | null {
  if (typeof window === "undefined") return null;
  const channel = (window as unknown as { gravitDesktop?: { files?: RawFilesChannel } })
    .gravitDesktop?.files;
  return channel && "function" === typeof channel.invoke && "function" === typeof channel.on
    ? new DesktopFilesBridge(channel)
    : null;
}

/** The last part of a path, whichever separator it uses. */
export function baseName(path: string): string {
  return path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
}

/**
 * The dialog filter of a list of file types: one entry, as the browser
 * pickers get, named "*.a, *.b".
 */
export function dialogFilters(fileTypes: readonly StorageFileType[]): DesktopFilter[] {
  const extensions = fileTypes
    .map((type) => type.ext.replace(/^\./, ""))
    .filter((extension) => extension.length > 0);
  return extensions.length
    ? [{ name: extensions.map((extension) => "*." + extension).join(", "), extensions }]
    : [];
}

/** The writable of a path: the bytes are collected and written when it closes. */
class DesktopWritable implements WritableLike {
  private _parts: BlobPart[] = [];

  constructor(private readonly _handle: DesktopFileHandle) {}

  truncate(size: number): Promise<void> {
    if (size !== 0) return Promise.reject(new Error("Only truncate(0) is supported."));
    this._parts = [];
    return Promise.resolve();
  }

  write(data: BlobPart): Promise<void> {
    this._parts.push(data);
    return Promise.resolve();
  }

  async close(): Promise<void> {
    const bytes = new Uint8Array(await new Blob(this._parts).arrayBuffer());
    await this._handle.bridge.write(this._handle.path, bytes);
  }
}

/** A file of the main process as a file handle. */
export class DesktopFileHandle implements FileHandleLike {
  constructor(
    readonly path: string,
    readonly bridge: DesktopFilesBridge,
  ) {}

  get name(): string {
    return baseName(this.path);
  }

  async getFile(): Promise<File> {
    return new File([(await this.bridge.read(this.path)) as Uint8Array<ArrayBuffer>], this.name);
  }

  createWritable(): Promise<WritableLike> {
    return Promise.resolve(new DesktopWritable(this));
  }
}
