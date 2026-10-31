# Features worth knowing

Things the app does that are not obvious from the menus.

## Guides

- **Manage Guides.** Double-click a guide line with the select tool to open a
  dialog listing every guide of both axes, with a remove button per row and
  "+ Add" per axis. Typed expressions such as `87+95` are evaluated, the
  double-clicked guide's row is outlined and focused, Enter commits a field
  and a second Enter saves. The whole batch is one undo step ("Change
  guides"). Code: `editor/guides/guide-edit-request.ts`,
  `app/dialogs/manage-guides*`.
- **Lock Guides.** A toolbar button toggles the scene property `gll`. While
  it is set, guides cannot be found, moved, deleted or opened in Manage
  Guides. One undo step ("Toggle guide lock"). Unlocking saves nothing for
  `gll`, so documents that are not locked stay as they were.
- **Ruler origin.** Drag from the corner between the rulers to set the
  rulers' 0 to the dropped point, snapped like a dragged guide; double-click
  the corner to reset. Stored as the scene properties `rox` and `roy`. It
  relabels the rulers, the hint while dragging a guide, the positions in
  Manage Guides and the Inspector's X and Y fields. W and H stay as they are.

## Files in the desktop app

The desktop app works with real paths; in a browser the browser's own file
pickers and downloads are used.

- **Save and Save As.** Ctrl+S writes back to the file a document was opened
  from or last saved to. Ctrl+Shift+S is Save As: the system's save dialog in
  the folder last used, adding `.gvdesign` when the name has no extension.
  Exports (PNG, SVG, PDF) have no shortcut.
- **Open.** Ctrl+O opens the system dialog, several files at once. A
  `.gvdesign` file is identified by its path, so opening one that is already
  open shows that document instead of a second copy.
- **Opened by the system.** A double click, "Open with" or the command line
  opens the file; while the app runs, a second launch opens the file in the
  running window.
- **Recent files.** File > Open Recent and the welcome screen list the last
  ten files opened or saved. Kept in the profile's `recent-files.json`.
- **Closing.** Closing the window asks about each unsaved document (save,
  don't save, cancel).
- **The window** keeps its size, place and maximized state
  (`window-state.json`).
- **Linux file type.** On start, the packaged app registers `.gvdesign` as
  `application/x-gravit-design` with its icon in `~/.local/share`, so file
  managers show the icon. An AppImage also installs a hidden launcher and
  becomes the program that opens the type unless another is chosen. The
  `.deb` declares the same through the `fileAssociations` entry of the
  electron-builder config. Code: `electron/linux-mime.ts`.

The page can only read and write paths the main process gave it: chosen in a
dialog, named on the command line, or in the recent list. Code:
`electron/files.ts`, `app/desktop/`.

## Looks

Two looks share the app: Gravit Next (the default) and classic. Start the
desktop app with `GD_BRANDING=classic` to see classic (`next` is the
default). Next is the old theme with the magenta accent, the new logo and a
neutral dark grey welcome sidebar.
