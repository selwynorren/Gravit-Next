/**
 * The container of the desktop app (CHG-004): the browser container with
 * the desktop storage, the documents the system asked for when the app was
 * started (a double click on a .gvdesign file, "Open with", the command
 * line), the recent files of the main process, and the close prompt for
 * unsaved documents.
 */
import type { Designer } from "../shell/designer.ts";
import { BrowserContainer } from "../shell/browser-container.ts";
import { OpenFileRequest, type RecentDocument } from "../shell/container.ts";
import {
  desktopFilesBridge,
  type DesktopFileRecord,
  type DesktopFilesBridge,
} from "./desktop-files.ts";
import { DesktopFileStorage } from "./desktop-storage.ts";

type OpeningDesigner = Pick<Designer, "openDocument" | "handleUnsavedDocuments">;

export class DesktopContainer extends BrowserContainer {
  declare protected _storage: DesktopFileStorage;
  private _recent: string[];
  private _designer: OpeningDesigner | null = null;
  /** Documents the system sent before the designer was up. */
  private _waiting: DesktopFileRecord[];
  private _asking = false;

  constructor(
    private readonly _bridge: DesktopFilesBridge,
    recent: string[],
    pending: DesktopFileRecord[],
  ) {
    super();
    this._storage = new DesktopFileStorage(_bridge);
    this._recent = recent;
    this._waiting = pending;
    // A second launch, or a document opened with this app while it runs.
    _bridge.onOpen((records) => this._open(records));
    _bridge.onRecentChanged((paths) => {
      this._recent = paths;
    });
  }

  /** Not a start URL request, but it keeps the welcome screen from opening over the documents. */
  override start(): OpenFileRequest | null {
    return this._waiting.length
      ? new OpenFileRequest(OpenFileRequest.Type.Document, this._waiting)
      : null;
  }

  /** The recent files, newest first. Every call makes new items, so a file changed on disk is read again. */
  override getRecentDocuments(): RecentDocument[] {
    return this._recent.map((path) => this._storage.item(path, null) as unknown as RecentDocument);
  }

  /** The app is up: opens what was waiting and answers the window's close. */
  attach(designer: OpeningDesigner): void {
    this._designer = designer;
    const waiting = this._waiting;
    this._waiting = [];
    this._open(waiting);
    this._bridge.onCloseRequest(() => this._closeRequested());
    this._bridge.setCloseGuard(true);
  }

  private _open(records: DesktopFileRecord[]): void {
    if (!this._designer) {
      this._waiting.push(...records);
      return;
    }
    for (const record of records) {
      try {
        this._designer.openDocument(
          this._storage.item(record.path, record.data) as unknown as Parameters<
            OpeningDesigner["openDocument"]
          >[0],
        );
      } catch (error) {
        console.error("Cannot open " + record.path, error);
      }
    }
  }

  /**
   * The window is closing: asks about each unsaved document (save, discard
   * or cancel) and closes the window when none is left, or stays when one
   * save is cancelled.
   */
  private _closeRequested(): void {
    if (this._asking || !this._designer) return;
    this._asking = true;
    this._designer
      .handleUnsavedDocuments()
      .then(
        () => this._bridge.confirmClose(),
        () => undefined,
      )
      .finally(() => {
        this._asking = false;
      });
  }

  override toString(): string {
    return "[Object GDesktopContainer]";
  }
}

/** The desktop container with what the main process has for the start, or null in a browser. */
export async function createDesktopContainer(): Promise<DesktopContainer | null> {
  const bridge = desktopFilesBridge();
  if (!bridge) return null;
  try {
    const [pending, recent] = await Promise.all([bridge.takePending(), bridge.recent()]);
    return new DesktopContainer(bridge, recent, pending);
  } catch (error) {
    console.warn("The desktop file channel is not usable, using the browser storage.", error);
    return null;
  }
}
