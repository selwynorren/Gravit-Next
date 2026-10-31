import { describe, expect, it } from "vitest";
import { DesktopChannel } from "./desktop-channels.ts";
import { DesktopFilesBridge, type RawFilesChannel } from "./desktop-files.ts";
import type { DesktopFileItem } from "./desktop-storage.ts";
import { DesktopFileStorage } from "./desktop-storage.ts";

const types = [{ ext: "gvdesign", mime: "application/x-gravit-design" }];

function storage(answers: Record<string, unknown | Error>): {
  storage: DesktopFileStorage;
  invoked: [string, unknown][];
} {
  const invoked: [string, unknown][] = [];
  const raw: RawFilesChannel = {
    invoke: (name, payload) => {
      invoked.push([name, payload]);
      const answer = answers[name];
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    },
    send: () => {},
    on: () => {},
  };
  return { storage: new DesktopFileStorage(new DesktopFilesBridge(raw)), invoked };
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("DesktopFileStorage", () => {
  it("can save and prompt, which a browser without the API cannot", () => {
    const { storage: s } = storage({});
    expect(s.canSave()).toBe(true);
    expect(s.canPromptSave()).toBe(true);
    expect(s.canPromptOpen()).toBe(true);
  });

  it("opens every chosen file as an item with its path", async () => {
    const { storage: s, invoked } = storage({
      [DesktopChannel.OpenDialog]: [
        { path: "/d/a.gvdesign", name: "a.gvdesign", data: new Uint8Array([1]) },
        { path: "/d/b.gvdesign", name: "b.gvdesign", data: new Uint8Array([2]) },
      ],
    });
    const opened: [string | null, number][] = [];
    s.openPrompt(types, (item, count) => opened.push([item.getFullName(), count]), true);
    await settle();
    expect(opened).toEqual([
      ["a.gvdesign", 2],
      ["b.gvdesign", 2],
    ]);
    expect(invoked[0]).toEqual([
      DesktopChannel.OpenDialog,
      { filters: [{ name: "*.gvdesign", extensions: ["gvdesign"] }], multiple: true },
    ]);
  });

  it("calls nothing when the open dialog is cancelled", async () => {
    const { storage: s } = storage({ [DesktopChannel.OpenDialog]: [] });
    let called = false;
    s.openPrompt(types, () => (called = true));
    await settle();
    expect(called).toBe(false);
  });

  it("saves through the item to the chosen path", async () => {
    const { storage: s, invoked } = storage({ [DesktopChannel.SaveDialog]: "/d/new.gvdesign" });
    let saved: DesktopFileItem | null = null;
    s.savePrompt("new.gvdesign", types, (item) => (saved = item as DesktopFileItem));
    await settle();
    expect(saved).not.toBeNull();
    const item = saved as unknown as DesktopFileItem;
    expect(item.getFullName()).toBe("new.gvdesign");
    expect(item.getPath()).toBe("/d/new.gvdesign");
    await new Promise<void>((resolve) => item.write(new Uint8Array([7, 8]), resolve));
    const write = invoked.find(([name]) => name === DesktopChannel.Write);
    expect(write?.[1]).toEqual({ path: "/d/new.gvdesign", data: new Uint8Array([7, 8]) });
  });

  it("calls cancel when the save dialog is cancelled", async () => {
    const { storage: s } = storage({ [DesktopChannel.SaveDialog]: null });
    let cancelled = false;
    let saved = false;
    s.savePrompt(
      "a",
      types,
      () => (saved = true),
      () => (cancelled = true),
    );
    await settle();
    expect(cancelled).toBe(true);
    expect(saved).toBe(false);
  });

  it("downloads when the save dialog fails", async () => {
    const { storage: s } = storage({ [DesktopChannel.SaveDialog]: new Error("no") });
    let item: DesktopFileItem | null = null;
    s.savePrompt("a.gvdesign", types, (i) => (item = i as DesktopFileItem));
    await settle();
    expect((item as unknown as DesktopFileItem).getFullName()).toBe("a.gvdesign");
  });
});

describe("DesktopFileItem", () => {
  it("is identified by its path only for a .gvdesign file", () => {
    const { storage: s } = storage({});
    expect(s.item("/d/a.gvdesign", null).getUniqueId()).toBe("/d/a.gvdesign");
    expect(s.item("/d/a.png", null).getUniqueId()).toBeNull();
  });
});
