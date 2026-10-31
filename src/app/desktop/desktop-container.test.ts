import { describe, expect, it } from "vitest";
import { DesktopChannel } from "./desktop-channels.ts";
import { DesktopContainer } from "./desktop-container.ts";
import {
  DesktopFilesBridge,
  type DesktopFileRecord,
  type RawFilesChannel,
} from "./desktop-files.ts";

function setup(recent: string[], pending: DesktopFileRecord[]) {
  const sent: [string, unknown][] = [];
  const listeners = new Map<string, (data: unknown) => void>();
  const raw: RawFilesChannel = {
    invoke: () => Promise.resolve(undefined),
    send: (name, payload) => void sent.push([name, payload]),
    on: (name, listener) => void listeners.set(name, listener),
  };
  const container = new DesktopContainer(new DesktopFilesBridge(raw), recent, pending);
  const opened: (string | null)[] = [];
  let unsaved: () => Promise<void> = () => Promise.resolve();
  const designer = {
    openDocument: (item: { getFullName(): string | null }) => {
      opened.push(item.getFullName());
      return undefined;
    },
    handleUnsavedDocuments: () => unsaved(),
  };
  return {
    container,
    designer,
    opened,
    sent,
    emit: (name: string, data?: unknown) => listeners.get(name)?.(data),
    setUnsaved: (handler: () => Promise<void>) => (unsaved = handler),
  };
}

const record = (name: string): DesktopFileRecord => ({
  path: "/d/" + name,
  name,
  data: new Uint8Array([1]),
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("DesktopContainer", () => {
  it("asks for no welcome screen while documents wait", () => {
    expect(setup([], [record("a.gvdesign")]).container.start()).not.toBeNull();
    expect(setup([], []).container.start()).toBeNull();
  });

  it("opens the waiting documents once the app is up", () => {
    const { container, designer, opened } = setup([], [record("a.gvdesign"), record("b.gvdesign")]);
    container.attach(designer as never);
    expect(opened).toEqual(["a.gvdesign", "b.gvdesign"]);
  });

  it("holds documents sent before the app is up, and opens later ones at once", () => {
    const { container, designer, opened, emit } = setup([], []);
    emit(DesktopChannel.OpenFiles, [record("early.gvdesign")]);
    expect(opened).toEqual([]);
    container.attach(designer as never);
    expect(opened).toEqual(["early.gvdesign"]);
    emit(DesktopChannel.OpenFiles, [record("late.gvdesign")]);
    expect(opened).toEqual(["early.gvdesign", "late.gvdesign"]);
  });

  it("lists the recent files as items, and follows the main process", () => {
    const { container, emit } = setup(["/d/a.gvdesign"], []);
    expect(container.getRecentDocuments().map((item) => item.getName())).toEqual(["a"]);
    emit(DesktopChannel.RecentChanged, ["/d/b.gvdesign", "/d/a.gvdesign"]);
    expect(container.getRecentDocuments().map((item) => item.getName())).toEqual(["b", "a"]);
  });

  it("turns the close guard on", () => {
    const { container, designer, sent } = setup([], []);
    container.attach(designer as never);
    expect(sent).toEqual([[DesktopChannel.CloseGuard, true]]);
  });

  it("confirms the close when the unsaved documents are dealt with", async () => {
    const { container, designer, sent, emit } = setup([], []);
    container.attach(designer as never);
    emit(DesktopChannel.CloseRequest);
    await settle();
    expect(sent).toContainEqual([DesktopChannel.CloseConfirmed, undefined]);
  });

  it("stays open when a save is cancelled", async () => {
    const { container, designer, sent, emit, setUnsaved } = setup([], []);
    container.attach(designer as never);
    setUnsaved(() => Promise.reject(new Error("cancelled")));
    emit(DesktopChannel.CloseRequest);
    await settle();
    expect(sent.some(([name]) => name === DesktopChannel.CloseConfirmed)).toBe(false);
  });

  it("asks once while it is asking", async () => {
    const { container, designer, sent, emit, setUnsaved } = setup([], []);
    container.attach(designer as never);
    let asked = 0;
    setUnsaved(() => {
      asked++;
      return new Promise((resolve) => setTimeout(resolve, 5));
    });
    emit(DesktopChannel.CloseRequest);
    emit(DesktopChannel.CloseRequest);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(asked).toBe(1);
    expect(sent.filter(([name]) => name === DesktopChannel.CloseConfirmed)).toHaveLength(1);
  });
});
