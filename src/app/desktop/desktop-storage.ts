/**
 * The local storage of the desktop app (CHG-004): the browser's file
 * storage with the native Open and Save As dialogs of the main process
 * instead of the browser's pickers. The files have real paths, so Save
 * writes back to the file a document was opened from, the dialogs start
 * in the folder last used, and the recent files can be listed.
 */
import { FileTypes } from "../document/file-types.ts";
import { BrowserFileItem, BrowserFileStorage } from "../storage/file-system-access.ts";
import type {
  OpenCallback,
  OpenPromptOptions,
  Storage,
  StorageData,
  StorageFileType,
  StorageItem,
} from "../storage/storage.ts";
import { dialogFilters, DesktopFileHandle, type DesktopFilesBridge } from "./desktop-files.ts";

/** A file on disk. A .gvdesign file is identified by its path, so opening it again shows the open one. */
export class DesktopFileItem extends BrowserFileItem {
  constructor(
    storage: Storage,
    data: StorageData,
    private readonly _handle: DesktopFileHandle,
  ) {
    super(storage, data, _handle.name, _handle);
  }

  getPath(): string {
    return this._handle.path;
  }

  override getUniqueId(): string | null {
    return this.getExtension() === FileTypes.GVDESIGN.ext.toUpperCase() ? this._handle.path : null;
  }
}

export class DesktopFileStorage extends BrowserFileStorage {
  constructor(private readonly _bridge: DesktopFilesBridge) {
    super();
  }

  /** The main process writes files, so there is always a place to save to. */
  protected override _hasFileAPI(): boolean {
    return true;
  }

  /** A dialog chosen file opened with its bytes. */
  item(path: string, data: StorageData): DesktopFileItem {
    return new DesktopFileItem(this, data, new DesktopFileHandle(path, this._bridge));
  }

  override openPrompt(
    fileTypes: readonly StorageFileType[],
    done: OpenCallback,
    multiple?: boolean,
    options: OpenPromptOptions = {},
  ): void {
    // The hidden file input stays for what is not a document of the user's
    // (an image to place, a font): no path to remember there.
    if (options.disableFileSystemAccessAPI) {
      super.openPrompt(fileTypes, done, multiple, options);
      return;
    }
    this._bridge
      .openDialog(dialogFilters(fileTypes), !!multiple)
      .then((records) => {
        for (const record of records) done(this.item(record.path, record.data), records.length);
      })
      .catch((error: unknown) => console.warn("The open dialog failed", error));
  }

  override savePrompt(
    name: string,
    fileTypes: readonly StorageFileType[],
    done: (item: StorageItem) => unknown,
    cancel?: (() => void) | null,
  ): void {
    let picked = false;
    this._bridge
      .saveDialog(name, dialogFilters(fileTypes))
      .then((path) => {
        if (!path) {
          if (cancel) cancel();
          return undefined;
        }
        picked = true;
        return done(this.item(path, null));
      })
      .catch((error: unknown) => {
        // As the browser storage: a failed dialog downloads, a failing
        // callback is not the dialog's fault.
        if (picked) {
          console.error(error);
          return undefined;
        }
        return this.download(name, done);
      });
  }
}
