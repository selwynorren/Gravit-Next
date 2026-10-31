import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopChannel as Channel } from "../src/app/desktop/desktop-channels.ts";

type Handler = (event: unknown, payload?: unknown) => unknown;
const handlers = new Map<string, Handler>();
const listeners = new Map<string, Handler>();
const dialogs = {
  open: { canceled: true, filePaths: [] as string[] },
  save: { canceled: true, filePath: "" },
};

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
    on: (channel: string, handler: Handler) => listeners.set(channel, handler),
  },
  dialog: {
    showOpenDialog: () => Promise.resolve(dialogs.open),
    showSaveDialog: () => Promise.resolve(dialogs.save),
  },
}));

const { DesktopFiles } = await import("./files.ts");

const ORIGIN = "http://127.0.0.1:47823";
const page = { sender: { getURL: () => ORIGIN + "/" } };
const stranger = { sender: { getURL: () => "https://example.com/" } };

let root: string;
let sent: [string, unknown][];
let closed: number;
let files: InstanceType<typeof DesktopFiles>;

function invoke(channel: string, payload?: unknown, event: unknown = page): unknown {
  return (handlers.get(channel) as Handler)(event, payload);
}

beforeEach(() => {
  handlers.clear();
  listeners.clear();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "gd-files-"));
  sent = [];
  closed = 0;
  const window = {
    webContents: { send: (channel: string, data: unknown) => sent.push([channel, data]) },
    close: () => closed++,
  };
  files = new DesktopFiles(path.join(root, "recent-files.json"), () => window as never, ORIGIN);
  files.register();
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function document(name: string, content = "x"): string {
  const file = path.join(root, name);
  fs.writeFileSync(file, content);
  return file;
}

describe("DesktopFiles opening", () => {
  it("hands over the documents named at the start once, and remembers them", async () => {
    const a = document("a.gvdesign", "AAA");
    files.openCommandLine(["app", a, "--x"], root);
    const records = (await invoke(Channel.TakePending)) as { path: string; data: Uint8Array }[];
    expect(records.map((r) => r.path)).toEqual([a]);
    expect(Buffer.from(records[0]?.data ?? []).toString()).toBe("AAA");
    expect(await invoke(Channel.TakePending)).toEqual([]);
    expect(await invoke(Channel.Recent)).toEqual([a]);
  });

  it("sends a document of a second launch to the running page, but queues it before that", async () => {
    const a = document("a.gvdesign");
    const b = document("b.gvdesign");
    files.openCommandLine(["app", a], root);
    expect(sent).toEqual([]);
    await invoke(Channel.TakePending);
    sent = [];
    files.openCommandLine(["app", b], root);
    const open = sent.find(([channel]) => channel === Channel.OpenFiles);
    expect((open?.[1] as { path: string }[]).map((r) => r.path)).toEqual([b]);
  });

  it("opens what the dialog chose, and nothing when it is cancelled", async () => {
    const a = document("a.gvdesign");
    dialogs.open = { canceled: false, filePaths: [a] };
    const records = (await invoke(Channel.OpenDialog, {
      filters: [],
      multiple: true,
    })) as unknown[];
    expect(records).toHaveLength(1);
    dialogs.open = { canceled: true, filePaths: [] };
    expect(await invoke(Channel.OpenDialog, {})).toEqual([]);
  });
});

describe("DesktopFiles writing", () => {
  it("writes to a chosen path and puts it in the recent files", async () => {
    const target = path.join(root, "new");
    dialogs.save = { canceled: false, filePath: target };
    const chosen = await invoke(Channel.SaveDialog, {
      name: "new",
      filters: [{ name: "*.gvdesign", extensions: ["gvdesign"] }],
    });
    expect(chosen).toBe(target + ".gvdesign");
    await invoke(Channel.Write, { path: chosen, data: new Uint8Array([65, 66]) });
    expect(fs.readFileSync(target + ".gvdesign", "utf8")).toBe("AB");
    expect(await invoke(Channel.Recent)).toEqual([target + ".gvdesign"]);
    expect(sent).toContainEqual([Channel.RecentChanged, [target + ".gvdesign"]]);
  });

  it("returns null when the save dialog is cancelled", async () => {
    dialogs.save = { canceled: true, filePath: "" };
    expect(await invoke(Channel.SaveDialog, { name: "a" })).toBeNull();
  });

  it("refuses a path nobody chose", async () => {
    const other = path.join(root, "other.txt");
    await expect(
      Promise.resolve(invoke(Channel.Write, { path: other, data: new Uint8Array([1]) })),
    ).rejects.toThrow("not chosen");
    expect(fs.existsSync(other)).toBe(false);
    await expect(Promise.resolve(invoke(Channel.Read, "/etc/passwd"))).rejects.toThrow(
      "not chosen",
    );
  });

  it("refuses a page that is not the app", async () => {
    expect(() => invoke(Channel.Recent, undefined, stranger)).toThrow("Not allowed");
  });

  it("remembers the recent files between runs and drops the ones that are gone", () => {
    const a = document("a.gvdesign");
    files.queueOpen([a]);
    void invoke(Channel.TakePending);
    const again = new DesktopFiles(path.join(root, "recent-files.json"), () => null, ORIGIN);
    expect(again.recent()).toEqual([a]);
    fs.rmSync(a);
    expect(again.recent()).toEqual([]);
  });
});

describe("DesktopFiles closing", () => {
  it("closes at once when the page cannot answer", () => {
    expect(files.allowsClose()).toBe(true);
  });

  it("asks the page first, then closes when it confirms", () => {
    listeners.get(Channel.CloseGuard)?.(page, true);
    expect(files.allowsClose()).toBe(false);
    expect(sent).toContainEqual([Channel.CloseRequest, undefined]);
    listeners.get(Channel.CloseConfirmed)?.(page);
    expect(closed).toBe(1);
    expect(files.allowsClose()).toBe(true);
  });

  it("ignores close messages from other pages", () => {
    listeners.get(Channel.CloseGuard)?.(stranger, true);
    expect(files.allowsClose()).toBe(true);
    listeners.get(Channel.CloseGuard)?.(page, true);
    listeners.get(Channel.CloseConfirmed)?.(stranger);
    expect(closed).toBe(0);
  });

  it("forgets the guard when the page loads again", () => {
    listeners.get(Channel.CloseGuard)?.(page, true);
    files.pageLoading();
    expect(files.allowsClose()).toBe(true);
  });
});
