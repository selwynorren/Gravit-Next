import { describe, expect, it } from "vitest";
import {
  baseName,
  DesktopFileHandle,
  DesktopFilesBridge,
  dialogFilters,
  type RawFilesChannel,
} from "./desktop-files.ts";
import { DesktopChannel } from "./desktop-channels.ts";

/** A channel that records the calls and answers invokes from `answers`. */
function channel(answers: Record<string, unknown> = {}): {
  raw: RawFilesChannel;
  invoked: [string, unknown][];
  sent: [string, unknown][];
  listeners: Map<string, (data: unknown) => void>;
} {
  const invoked: [string, unknown][] = [];
  const sent: [string, unknown][] = [];
  const listeners = new Map<string, (data: unknown) => void>();
  return {
    invoked,
    sent,
    listeners,
    raw: {
      invoke: (name, payload) => {
        invoked.push([name, payload]);
        return Promise.resolve(answers[name]);
      },
      send: (name, payload) => void sent.push([name, payload]),
      on: (name, listener) => void listeners.set(name, listener),
    },
  };
}

describe("baseName", () => {
  it("takes the last part of either kind of path", () => {
    expect(baseName("/home/me/logo.gvdesign")).toBe("logo.gvdesign");
    expect(baseName("C:\\Users\\me\\logo.gvdesign")).toBe("logo.gvdesign");
    expect(baseName("logo.gvdesign")).toBe("logo.gvdesign");
  });
});

describe("dialogFilters", () => {
  it("makes one filter named like the browser pickers' description", () => {
    expect(
      dialogFilters([
        { ext: "gvdesign", mime: "a" },
        { ext: ".svg", mime: "b" },
      ]),
    ).toEqual([{ name: "*.gvdesign, *.svg", extensions: ["gvdesign", "svg"] }]);
  });

  it("makes none for no types", () => {
    expect(dialogFilters([])).toEqual([]);
  });
});

describe("DesktopFilesBridge", () => {
  it("sends the dialog options on the right channels", async () => {
    const { raw, invoked } = channel({ [DesktopChannel.SaveDialog]: "/d/a.gvdesign" });
    const bridge = new DesktopFilesBridge(raw);
    const filters = [{ name: "*.gvdesign", extensions: ["gvdesign"] }];
    expect(await bridge.saveDialog("a", filters)).toBe("/d/a.gvdesign");
    await bridge.openDialog(filters, true);
    expect(invoked).toEqual([
      [DesktopChannel.SaveDialog, { name: "a", filters }],
      [DesktopChannel.OpenDialog, { filters, multiple: true }],
    ]);
  });

  it("passes the close messages", () => {
    const { raw, sent, listeners } = channel();
    const bridge = new DesktopFilesBridge(raw);
    let asked = 0;
    bridge.onCloseRequest(() => asked++);
    listeners.get(DesktopChannel.CloseRequest)?.(undefined);
    bridge.setCloseGuard(true);
    bridge.confirmClose();
    expect(asked).toBe(1);
    expect(sent).toEqual([
      [DesktopChannel.CloseGuard, true],
      [DesktopChannel.CloseConfirmed, undefined],
    ]);
  });
});

describe("DesktopFileHandle", () => {
  it("reads the file through the channel", async () => {
    const { raw, invoked } = channel({ [DesktopChannel.Read]: new Uint8Array([1, 2, 3]) });
    const handle = new DesktopFileHandle("/d/a.gvdesign", new DesktopFilesBridge(raw));
    const file = await handle.getFile();
    expect(file.name).toBe("a.gvdesign");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(invoked).toEqual([[DesktopChannel.Read, "/d/a.gvdesign"]]);
  });

  it("writes everything at close, and only the last truncated content", async () => {
    const { raw, invoked } = channel();
    const handle = new DesktopFileHandle("/d/a.gvdesign", new DesktopFilesBridge(raw));
    const writable = await handle.createWritable();
    await writable.write(new Uint8Array([9, 9]));
    await writable.truncate(0);
    await writable.write(new Uint8Array([1, 2]));
    await writable.write(new Uint8Array([3]));
    expect(invoked).toEqual([]);
    await writable.close();
    expect(invoked).toHaveLength(1);
    const [name, payload] = invoked[0] as [string, { path: string; data: Uint8Array }];
    expect(name).toBe(DesktopChannel.Write);
    expect(payload.path).toBe("/d/a.gvdesign");
    expect(payload.data).toEqual(new Uint8Array([1, 2, 3]));
  });
});
