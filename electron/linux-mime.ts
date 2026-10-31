/**
 * Makes Linux know .gvdesign files (CHG-004): their own MIME type (so they
 * are not shown as a generic gzip archive), their icon, and, for an
 * AppImage, the app as the program that opens them. The packages (.deb)
 * declare the association themselves (the fileAssociations entry of the
 * electron-builder config); an AppImage has no install step, so this runs
 * at every start of the packaged app and changes nothing when everything
 * is in place already. It is best effort: a missing tool is skipped and
 * never stops the app.
 *
 * The icon is routed through <generic-icon>, not <icon>: Nemo's list view
 * ignores an <icon> of a custom type (found out with the old app).
 */
import fs from "node:fs";
import path from "node:path";

export const MIME_TYPE = "application/x-gravit-design";
export const MIME_ICON_NAME = "application-x-gvdesign";
export const MIME_FILE = "gravit-next-gvdesign.xml";
export const DESKTOP_FILE = "gravit-next-appimage.desktop";
export const ICON_SIZES = [16, 32, 48, 128, 256, 512] as const;

export const MIME_XML = `<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="${MIME_TYPE}">
    <comment>Gravit document</comment>
    <generic-icon name="${MIME_ICON_NAME}"/>
    <glob pattern="*.gvdesign"/>
  </mime-type>
</mime-info>
`;

/** The launcher that lets the system open .gvdesign files with the AppImage. Hidden from the menus. */
export function desktopEntry(appImage: string, productName: string): string {
  // The Exec value is quoted; inside quotes a backslash, quote, dollar sign and backtick are escaped.
  const quoted = '"' + appImage.replace(/(["`$\\])/g, "\\$1") + '"';
  return `[Desktop Entry]
Type=Application
Name=${productName}
Exec=${quoted} %F
Icon=${MIME_ICON_NAME}
MimeType=${MIME_TYPE};
NoDisplay=true
Terminal=false
`;
}

export type Run = (command: string, args: string[]) => Promise<string | null>;

export interface LinuxMimeOptions {
  /** XDG_DATA_HOME, normally ~/.local/share. */
  dataHome: string;
  /** The folder with icon-<size>.png files (the client's brand/icons). */
  iconSource: string;
  /** The AppImage's path (the APPIMAGE variable), or null for any other install. */
  appImage: string | null;
  productName: string;
  /** Runs a command and gives its output, or null when it is missing or fails. */
  run: Run;
  /** Folders with .desktop files, to tell a handler that is gone from one that is installed. */
  applicationDirs?: readonly string[];
}

/** Writes `content` unless the file has it already; true when it wrote. */
function writeIfChanged(file: string, content: string | Buffer): boolean {
  try {
    if (fs.readFileSync(file).equals(Buffer.from(content))) return false;
  } catch {
    // Missing: write it.
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

export async function registerLinuxMime(options: LinuxMimeOptions): Promise<void> {
  const { dataHome, iconSource, appImage, productName, run } = options;

  const mimeRoot = path.join(dataHome, "mime");
  if (writeIfChanged(path.join(mimeRoot, "packages", MIME_FILE), MIME_XML))
    await run("update-mime-database", [mimeRoot]);

  const iconTheme = path.join(dataHome, "icons", "hicolor");
  let iconsChanged = false;
  for (const size of ICON_SIZES) {
    let image: Buffer;
    try {
      image = fs.readFileSync(path.join(iconSource, `icon-${size}.png`));
    } catch {
      continue;
    }
    const target = path.join(iconTheme, `${size}x${size}`, "mimetypes", `${MIME_ICON_NAME}.png`);
    if (writeIfChanged(target, image)) iconsChanged = true;
  }
  if (iconsChanged) await run("gtk-update-icon-cache", ["-f", "-t", iconTheme]);

  if (!appImage) return;
  const applications = path.join(dataHome, "applications");
  writeIfChanged(path.join(applications, DESKTOP_FILE), desktopEntry(appImage, productName));
  // Take the default only while nobody has one (or the one named is gone), so a
  // program the user chose stays.
  const current = ((await run("xdg-mime", ["query", "default", MIME_TYPE])) ?? "").trim();
  const dirs = options.applicationDirs ?? [
    applications,
    "/usr/share/applications",
    "/usr/local/share/applications",
  ];
  const installed = dirs.some((dir) => fs.existsSync(path.join(dir, current)));
  if (!current || current === DESKTOP_FILE || !installed)
    await run("xdg-mime", ["default", DESKTOP_FILE, MIME_TYPE]);
}
